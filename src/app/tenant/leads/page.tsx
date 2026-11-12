import Link from 'next/link';
import LeadUpload from '@/components/LeadUpload';
import { createClient } from '@/lib/supabase/server';

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase.from('leads').select('id, name, phone, email, status, created_at').order('created_at', { ascending: false }).limit(50);
  const { data: campaigns } = await supabase.from('campaigns').select('id, name, status').order('created_at', { ascending: false });
  return <main className="mx-auto max-w-6xl p-6"><Link className="text-sm text-blue-700" href="/tenant/dashboard">← Dashboard</Link><h1 className="mt-3 text-3xl font-bold">Leads & campaigns</h1><LeadUpload/><section className="mt-8"><h2 className="text-xl font-semibold">Campaigns</h2><ul className="mt-3 space-y-2">{campaigns?.map((campaign) => <li className="rounded-lg border bg-white p-3" key={campaign.id}>{campaign.name} <span className="text-sm text-slate-500">· {campaign.status}</span></li>)}</ul>{!campaigns?.length && <p className="mt-2 text-sm text-slate-500">No campaigns yet. Campaign creation can be enabled in your tenant workflow.</p>}</section><section className="mt-8"><h2 className="text-xl font-semibold">Recent leads</h2><div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Email</th><th className="p-3">Status</th></tr></thead><tbody>{leads?.map((lead) => <tr className="border-b" key={lead.id}><td className="p-3">{lead.name}</td><td className="p-3">{lead.phone}</td><td className="p-3">{lead.email ?? '—'}</td><td className="p-3">{lead.status}</td></tr>)}</tbody></table></div></section></main>;
}
