import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const phoneSchema = /^\+[1-9]\d{7,14}$/;
const rowSchema = z.object({ name: z.string().trim().min(1).max(160), phone: z.string().trim().regex(phoneSchema), email: z.string().trim().email().max(254).or(z.literal('')).optional(), source: z.string().trim().max(100).optional() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('tenant_id, role').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id || !['tenant_admin', 'supervisor'].includes(profile.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Select a non-empty CSV file up to 5 MB.' }, { status: 400 });
  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim().toLowerCase() });
  if (parsed.errors.length || parsed.data.length > 5000) return NextResponse.json({ error: 'Invalid CSV or more than 5,000 rows.' }, { status: 400 });
  const rows = parsed.data.map((row, index) => {
    const result = rowSchema.safeParse(row);
    return result.success ? { ...result.data, email: result.data.email || null, tenant_id: profile.tenant_id } : { invalidRow: index + 2 };
  });
  const badRow = rows.find((row) => 'invalidRow' in row);
  if (badRow && 'invalidRow' in badRow) return NextResponse.json({ error: `Invalid or missing name/phone on CSV row ${badRow.invalidRow}.` }, { status: 400 });
  const leads = rows as Array<{ name: string; phone: string; email: string | null; source?: string; tenant_id: string }>;
  if (leads.length === 0) return NextResponse.json({ error: 'The CSV has no lead rows.' }, { status: 400 });
  const { error } = await supabase.from('leads').insert(leads);
  if (error) return NextResponse.json({ error: 'Unable to import leads. Check the CSV and tenant permissions.' }, { status: 400 });
  return NextResponse.json({ imported: leads.length }, { status: 201 });
}
