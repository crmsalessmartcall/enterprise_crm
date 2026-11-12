import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startCall } from '@/lib/telephony/simple2call';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'agent') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  try { return NextResponse.json(await startCall(body), { status: 202 }); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Call request failed.';
    const status = message.startsWith('Enter a valid') ? 400 : message.includes('not configured') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
