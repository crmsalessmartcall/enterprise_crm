'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (authError) {
      setError('Unable to sign in. Check your credentials or contact your administrator.');
      setBusy(false);
      return;
    }
    window.location.assign('/tenant/dashboard');
  }

  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Enterprise S2C</p>
      <h1 className="mt-3 text-2xl font-bold">Sign in to your workspace</h1>
      <p className="mt-2 text-sm text-slate-600">Use the account provided by your administrator.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">Email<input required name="email" type="email" autoComplete="username" className="mt-1 w-full rounded-md border p-2" /></label>
        <label className="block text-sm font-medium">Password<input required name="password" type="password" autoComplete="current-password" className="mt-1 w-full rounded-md border p-2" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </main>;
}
