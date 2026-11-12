'use client';

import { FormEvent, useState } from 'react';

export default function LeadUpload() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/leads/import', { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Imported ${result.imported} leads.` : result.error ?? 'Import failed.');
    setBusy(false);
    if (response.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="mt-6 rounded-xl border bg-white p-5"><label className="block text-sm font-medium">Upload CSV (max 5 MB)<input className="mt-2 block w-full text-sm" type="file" name="file" accept=".csv,text/csv" required /></label><p className="mt-2 text-xs text-slate-500">Required header: name,phone. Optional: email,source. Phone numbers must be in E.164 format.</p><button disabled={busy} className="mt-4 rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Importing…' : 'Import leads'}</button>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</form>;
}
