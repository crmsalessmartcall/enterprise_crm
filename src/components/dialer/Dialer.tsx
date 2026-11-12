'use client';

import { FormEvent, useState } from 'react';

export default function Dialer() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setBusy(true);
    const phone = String(new FormData(event.currentTarget).get('phone') ?? '');
    try {
      const response = await fetch('/api/telephony/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const body = await response.json(); setMessage(response.ok ? `Call request accepted${body.callId ? ` (${body.callId})` : ''}.` : body.error ?? 'Call request failed.');
    } catch { setMessage('Call request failed.'); }
    setBusy(false);
  }
  return <form onSubmit={submit} className="mt-6 max-w-lg rounded-xl border bg-white p-6"><label className="block text-sm font-medium">Destination number<input required name="phone" type="tel" placeholder="+14155550123" pattern="\+[1-9][0-9]{7,14}" className="mt-1 w-full rounded-md border p-2" /></label><p className="mt-2 text-xs text-slate-500">Only call contacts with appropriate consent and in compliance with applicable rules.</p><button disabled={busy} className="mt-4 rounded-md bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Requesting…' : 'Start call'}</button>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</form>;
}
