import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SuperAdminDashboard() {
  const supabase = await createClient();
  const { data: tenants, error } = await supabase.from('tenants').select('id, name, created_at, max_users').order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load tenant list. Check the migration and administrator access.');
  return <main className="mx-auto max-w-6xl p-6"><p className="text-sm text-slate-500">Platform administration</p><h1 className="text-3xl font-bold">Super Admin</h1><p className="mt-2 text-slate-600">Tenant and user-limit overview. Tenant provisioning should be performed by a trusted server-side admin workflow.</p><div className="mt-8 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left"><thead><tr className="border-b text-slate-500"><th className="p-3">Tenant</th><th className="p-3">User limit</th><th className="p-3">Created</th></tr></thead><tbody>{tenants?.map((tenant) => <tr className="border-b" key={tenant.id}><td className="p-3">{tenant.name}</td><td className="p-3">{tenant.max_users}</td><td className="p-3">{new Date(tenant.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!tenants?.length && <p className="p-4 text-sm text-slate-500">No tenants have been provisioned.</p>}</div></main>;
}
