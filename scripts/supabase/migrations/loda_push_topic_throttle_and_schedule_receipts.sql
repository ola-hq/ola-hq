-- Deployed in Supabase project Ola HQ on 2026-10-12.
-- Notification receipt IDs and throttles are service-role only.
create table if not exists public.loda_push_throttle (
  topic text primary key check (topic in ('platica')),
  last_sent_at timestamptz not null default '-infinity'::timestamptz
);
alter table public.loda_push_throttle enable row level security;
revoke all on public.loda_push_throttle from anon, authenticated;

create table if not exists public.loda_push_schedule (
  event_id text primary key check (event_id in ('midnight-last-call', 'afters-self-serve')),
  provider_notification_id uuid,
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.loda_push_schedule enable row level security;
revoke all on public.loda_push_schedule from anon, authenticated;

create or replace function public.loda_claim_push_slot(topic_name text, cooldown_seconds integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare won integer;
begin
  if topic_name <> 'platica' or cooldown_seconds < 60 or cooldown_seconds > 3600 then
    raise exception 'Invalid notification throttle';
  end if;
  insert into public.loda_push_throttle as t (topic, last_sent_at)
  values (topic_name, now())
  on conflict (topic) do update set last_sent_at = excluded.last_sent_at
    where t.last_sent_at <= now() - make_interval(secs => cooldown_seconds);
  get diagnostics won = row_count;
  return won = 1;
end; $$;
revoke all on function public.loda_claim_push_slot(text, integer) from public, anon, authenticated;
grant execute on function public.loda_claim_push_slot(text, integer) to service_role;
