-- Applied to Ola HQ production Supabase for one beta push per Mexico-local date.
create table if not exists public.loda_push_beta_runs (
  local_date date primary key,
  provider_notification_id uuid not null,
  accepted_at timestamptz not null default now(),
  provider_recipients integer
);
alter table public.loda_push_beta_runs enable row level security;
revoke all on public.loda_push_beta_runs from anon, authenticated;
