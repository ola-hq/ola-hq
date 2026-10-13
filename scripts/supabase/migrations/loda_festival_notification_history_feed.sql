-- Applied to Ola HQ production Supabase on Oct 13, 2026.
-- Canonical public history for host-approved festival push broadcasts.
-- Future scheduled announcements are NOT readable before their send time.
create table if not exists public.loda_festival_notification_history (
  id text primary key check (id ~ '^[a-z0-9-]{1,90}$'),
  title_en text not null check (char_length(title_en) between 1 and 200),
  title_es text not null check (char_length(title_es) between 1 and 200),
  body_en text not null check (char_length(body_en) between 1 and 2000),
  body_es text not null check (char_length(body_es) between 1 and 2000),
  published_at timestamptz not null,
  kind text not null default 'festival' check (kind in ('festival','beta')),
  provider_notification_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists loda_festival_notification_history_recent_idx
  on public.loda_festival_notification_history(published_at desc);
alter table public.loda_festival_notification_history enable row level security;
create policy "Public may read released festival notifications"
  on public.loda_festival_notification_history for select to anon, authenticated
  using (published_at <= now());
revoke all on public.loda_festival_notification_history from anon, authenticated;
grant select on public.loda_festival_notification_history to anon, authenticated;
