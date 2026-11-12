# Enterprise S2C CRM

Tenant-aware CRM starter built with the Next.js App Router, Supabase Auth/Postgres, and a server-only Simple2Call adapter.

## Setup

1. Install Node.js 20.9 or later and run `npm install`.
2. Copy `.env.example` to `.env.local`; set the Supabase project URL and anon key. Keep `.env.local` and all service/provider secrets out of version control.
3. Apply `supabase/migrations/001_initial_schema.sql` with the Supabase CLI (`supabase db push`) or the SQL editor.
4. Provision users and `public.profiles` rows using a trusted administrative process. Do not allow user-submitted role or tenant IDs. Create a `super_admin` profile with a null tenant; assign all other roles to an existing tenant.
5. Set the server-only telephony URL and key only if you have the provider's documented API contract configured. The adapter sends a JSON `{ "to": "+..." }` body and expects an optional `id` response field; verify/customize it against your Simple2Call account before enabling calls.
6. Run `npm run dev`. Use `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.

## Roles and data isolation

Route protection is enforced in `src/middleware.ts`; authorization is also checked in API handlers, and PostgreSQL RLS is the final data boundary. Roles are `super_admin`, `tenant_admin`, `supervisor`, and `agent`. Tenant boundaries derive from the authenticated user's profile, never from a browser-supplied tenant ID. A backend provisioning workflow must enforce `tenants.max_users` and create users safely; no public signup is provided here.

The lead importer accepts CSV headers `name,phone` and optional `email,source`; phone numbers must use E.164 format and the import is limited to 5 MB / 5,000 rows. The sample CSV is for testing only; its contact data is illustrative.

## Production deployment checklist

- Configure secrets in your hosting provider; never expose service-role or telephony keys as `NEXT_PUBLIC_*` variables.
- Verify Supabase RLS policies and run tests against multiple tenants and roles.
- Configure provider-specific call authorization, consent/DNC checks, callback signature verification, idempotency, rate limiting, and audit/retention policies before enabling calling. Provider API contract varies; the included adapter is intentionally small and must be validated.
- Add monitoring, backups, database migration review, and a user-provisioning process that enforces tenant limits.
