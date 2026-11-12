import Link from 'next/link';
import Dialer from '@/components/dialer/Dialer';

export default function DialerPage() {
  return <main className="mx-auto max-w-5xl p-6"><Link href="/tenant/dashboard" className="text-sm text-blue-700">← Dashboard</Link><p className="mt-4 text-sm text-slate-500">Agent workspace</p><h1 className="text-3xl font-bold">Click-to-call</h1><Dialer/></main>;
}
