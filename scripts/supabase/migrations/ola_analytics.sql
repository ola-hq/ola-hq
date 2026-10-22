-- Private event storage. Only the collector/report Edge Function uses service_role.
create table public.ola_analytics_events (
 id uuid primary key,
 visitor_id uuid not null,
 session_id uuid not null,
 event_name text not null check (event_name in ('page_view','click','app_install')),
 path text not null check (length(path) between 1 and 300),
 surface text not null,
 mode text not null check (mode in ('browser','standalone')),
 target text not null default '' check (length(target) <= 350),
 label text not null default '' check (length(label) <= 100),
 referrer_host text not null default '' check (length(referrer_host) <= 150),
 language text not null default '' check (length(language) <= 12),
 source_hash text not null,
 is_test boolean not null default false,
 occurred_at timestamptz not null default now(),
 received_at timestamptz not null default now()
);
alter table public.ola_analytics_events enable row level security;
revoke all on public.ola_analytics_events from public, anon, authenticated;
grant select, insert, delete on public.ola_analytics_events to service_role;
create index ola_analytics_time_idx on public.ola_analytics_events (occurred_at desc);
create index ola_analytics_visitor_idx on public.ola_analytics_events (visitor_id, received_at desc);
create index ola_analytics_source_idx on public.ola_analytics_events (source_hash, received_at desc);

create function public.ola_analytics_report(report_days integer default 30, report_scope text default 'all')
returns jsonb language sql stable security invoker set search_path = public as $$
 with events as (
  select * from public.ola_analytics_events
  where not is_test and occurred_at >= now()-make_interval(days=>least(greatest(report_days,1),90))
  and (report_scope='all' or (report_scope='loda' and surface like 'loda_%') or (report_scope='hq' and surface like 'hq_%'))
 ), summary as (
  select count(distinct visitor_id) filter (where event_name='page_view') as visitors,
   count(distinct session_id) filter (where event_name='page_view') as visits,
   count(*) filter (where event_name='page_view') as page_views,
   count(*) filter (where event_name='click') as clicks,
   count(distinct visitor_id) filter (where event_name='page_view' and surface in ('loda_app','hq_app')) as app_visitors,
   count(distinct session_id) filter (where event_name='page_view' and mode='standalone') as installed_app_visits,
   count(*) filter (where event_name='app_install') as observed_installs
  from events
 ), pages as (
  select path, count(*) as views, count(distinct visitor_id) as visitors from events where event_name='page_view'
  group by path order by views desc limit 50
 ), clicks as (
  select path,target,label,count(*) as clicks from events where event_name='click'
  group by path,target,label order by clicks desc limit 50
 ), days as (
  select (occurred_at at time zone 'America/Mexico_City')::date as day,
   count(distinct visitor_id) filter (where event_name='page_view') as visitors,
   count(*) filter (where event_name='page_view') as views,
   count(*) filter (where event_name='click') as clicks from events group by 1 order by 1
 ), surfaces as (
  select surface,count(distinct visitor_id) filter (where event_name='page_view') as visitors,
   count(*) filter (where event_name='page_view') as views from events group by surface order by views desc
 ), sources as (
  select referrer_host,count(distinct visitor_id) as visitors from events
  where event_name='page_view' and referrer_host<>'' group by referrer_host order by visitors desc limit 20
 )
 select jsonb_build_object('summary',(select to_jsonb(summary) from summary),
  'pages',coalesce((select jsonb_agg(pages) from pages),'[]'::jsonb),
  'clicks',coalesce((select jsonb_agg(clicks) from clicks),'[]'::jsonb),
  'days',coalesce((select jsonb_agg(days) from days),'[]'::jsonb),
  'surfaces',coalesce((select jsonb_agg(surfaces) from surfaces),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(sources) from sources),'[]'::jsonb),
  'tracking_started',(select min(occurred_at) from public.ola_analytics_events where not is_test),
  'generated_at',now(),'days_requested',least(greatest(report_days,1),90),'scope',report_scope);
$$;
revoke all on function public.ola_analytics_report(integer,text) from public, anon, authenticated;
grant execute on function public.ola_analytics_report(integer,text) to service_role;
