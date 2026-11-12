import { z } from 'zod';

const callRequest = z.object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/) });

/** Server-only Simple2Call adapter. Provider URL and API key must never be exposed to the browser. */
export async function startCall(input: unknown) {
  const parsed = callRequest.safeParse(input);
  if (!parsed.success) throw new Error('Enter a valid E.164 destination number.');
  const endpoint = process.env.SIMPLE2CALL_API_URL;
  const apiKey = process.env.SIMPLE2CALL_API_KEY;
  if (!endpoint || !apiKey) throw new Error('Telephony integration is not configured.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: parsed.data.phone }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Telephony provider returned HTTP ${response.status}.`);
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object') throw new Error('Invalid telephony provider response.');
  const body = result as Record<string, unknown>;
  return { callId: typeof body.id === 'string' ? body.id : undefined };
}
