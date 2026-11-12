-- Initial tenant-aware schema. Run with Supabase CLI migrations.
create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'tenant_admin', 'supervisor', 'agent');
create type public.lead_status as enum ('new', 'queued', 'contacted', 'qualified', 'unqualified', 'do_not_call');
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  max_users integer not null default 25 check (max_users between 1 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete restrict,
  role public.app_role not null default 'agent',
  display_name text check (display_name is null or char_length(display_name) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint super_admin_without_tenant check ((role = 'super_admin' and tenant_id is null) or (role <> 'super_admin' and tenant_id is not null))
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  status public.campaign_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  phone text not null check (phone ~ '^\\+[1-9][0-9]{7,14}$'),
  email text check (email is null or char_length(email) <= 254),
  source text check (source is null or char_length(source) <= 100),
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, campaign_id) references public.campaigns(tenant_id, id) on delete set null
);

create table public.call_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  provider_call_id text,
  phone_number text not null check (phone_number ~ '^\\+[1-9][0-9]{7,14}$'),
  status text not null default 'requested' check (status in ('requested', 'ringing', 'answered', 'completed', 'failed', 'no_answer', 'busy')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index profiles_tenant_role_idx on public.profiles(tenant_id, role);
create index campaigns_tenant_created_idx on public.campaigns(tenant_id, created_at desc);
create index leads_tenant_created_idx on public.leads(tenant_id, created_at desc);
create index leads_tenant_phone_idx on public.leads(tenant_id, phone);
create index call_records_tenant_started_idx on public.call_records(tenant_id, started_at desc);

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id = (select auth.uid()) $$;

create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.tenant_id from public.profiles p where p.id = (select auth.uid()) $$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_tenant_id() to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.call_records enable row level security;

create policy "Super admins manage tenants" on public.tenants for all to authenticated
  using (public.current_user_role() = 'super_admin') with check (public.current_user_role() = 'super_admin');
create policy "Tenant members read their tenant" on public.tenants for select to authenticated
  using (id = public.current_tenant_id());

create policy "Users read own profile; super admins read all" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.current_user_role() = 'super_admin');
create policy "Super admins manage profiles" on public.profiles for all to authenticated
  using (public.current_user_role() = 'super_admin') with check (public.current_user_role() = 'super_admin');

create policy "Tenant staff read campaigns" on public.campaigns for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy "Tenant admins manage campaigns" on public.campaigns for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('tenant_admin', 'supervisor'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('tenant_admin', 'supervisor'));

create policy "Tenant staff read leads" on public.leads for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy "Tenant admins manage leads" on public.leads for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('tenant_admin', 'supervisor'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('tenant_admin', 'supervisor'));

create policy "Tenant staff read call records" on public.call_records for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy "Agents create own call records" on public.call_records for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and agent_id = (select auth.uid()) and public.current_user_role() = 'agent');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
create trigger tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

-- Do not allow public signup to assign roles or tenant IDs. Provision auth.users/profiles
-- through a trusted administrative process after verifying tenant user limits.
