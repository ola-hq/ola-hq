-- Dedicated, server-only receipt for the one-time independent Stress Report beta.
-- Keeps the ordinary one-beta-per-Guadalajara-day restriction unchanged.
-- Hosts use the authenticated edge function; no browser role can read/write receipts.
create table if not exists public.loda_push_special_beta_runs (
  beta_id text primary key check (beta_id ~ '^[a-z0-9-]{1,90}$'),
  provider_notification_id uuid not null,
  provider_recipients integer,
  accepted_at timestamptz not null default now()
);
alter table public.loda_push_special_beta_runs enable row level security;
revoke all on public.loda_push_special_beta_runs from anon, authenticated;
grant select, insert on public.loda_push_special_beta_runs to service_role;
comment on table public.loda_push_special_beta_runs is
  'Host-approved one-time independent beta push receipts; never exposed to app clients.';
