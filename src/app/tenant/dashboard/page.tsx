import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function TenantDashboard() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('tenant_id, role').maybeSingle();
  const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const { count: campaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
  const { data: recentCalls } = await supabase.from('call_records').select('id, phone_number, status, started_at').order('started_at', { ascending: false }).limit(8);
  return <main className="mx-auto max-w-6xl p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-500">Tenant workspace · {profile?.role ?? 'user'}</p><h1 className="text-3xl font-bold">Dashboard</h1></div><nav className="flex gap-4 text-blue-700"><Link href="/tenant/leads">Leads & campaigns</Link></nav></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-2"><Metric label="Leads" value={leads ?? 0}/><Metric label="Campaigns" value={campaigns ?? 0}/></section>
    <section className="mt-8 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Recent call activity</h2>{recentCalls?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Number</th><th className="p-2">Status</th><th className="p-2">Started</th></tr></thead><tbody>{recentCalls.map((call) => <tr key={call.id} className="border-b"><td className="p-2">{call.phone_number}</td><td className="p-2">{call.status}</td><td className="p-2">{call.started_at ? new Date(call.started_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">No calls recorded yet.</p>}</section>
    <p className="mt-4 text-xs text-slate-500">Tenant ID: {profile?.tenant_id ?? 'Not assigned'}</p>
  </main>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
