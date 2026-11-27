-- Opt-in pilot snapshots. No existing users/world tables are changed.
create table public.hq_orbit_pilots (
 id uuid primary key default gen_random_uuid(),
 owner_hash text not null unique check(owner_hash ~ '^[a-f0-9]{64}$'),
 tag text not null check(tag ~ '^[A-Z0-9]{3,5}$'),
 miles bigint not null check(miles between 0 and 1000000000000000),
 seconds bigint not null check(seconds between 0 and 1000000000),
 updated_at timestamptz not null default now()
);
alter table public.hq_orbit_pilots enable row level security;
revoke all on public.hq_orbit_pilots from public,anon,authenticated;
grant select,insert,update,delete on public.hq_orbit_pilots to service_role;
create index hq_orbit_rank on public.hq_orbit_pilots(miles desc,id);
create table public.hq_orbit_limits(source_hash text primary key, day date not null, writes integer not null default 0);
alter table public.hq_orbit_limits enable row level security;
revoke all on public.hq_orbit_limits from public,anon,authenticated;
grant select,insert,update,delete on public.hq_orbit_limits to service_role;
create function public.hq_orbit_save(p_owner text,p_source text,p_tag text,p_miles bigint,p_seconds bigint,p_remove boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old public.hq_orbit_pilots; result public.hq_orbit_pilots; hits integer;
begin
 if p_owner !~ '^[a-f0-9]{64}$' or p_source !~ '^[a-f0-9]{64}$' then raise exception 'INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
 if p_remove then delete from public.hq_orbit_pilots where owner_hash=p_owner; return jsonb_build_object('removed',true); end if;
 if p_tag !~ '^[A-Z0-9]{3,5}$' or p_miles not between 0 and 1000000000000000 or p_seconds not between 0 and 1000000000 then raise exception 'INVALID'; end if;
 select * into old from public.hq_orbit_pilots where owner_hash=p_owner;
 if old.id is not null and old.updated_at>now()-interval '5 seconds' then raise exception 'SLOW_DOWN'; end if;
 insert into public.hq_orbit_limits values(p_source,current_date,1)
 on conflict(source_hash) do update set day=current_date,writes=case when hq_orbit_limits.day=current_date then hq_orbit_limits.writes+1 else 1 end returning writes into hits;
 if hits>120 then raise exception 'SLOW_DOWN'; end if;
 delete from public.hq_orbit_limits where day<current_date-2;
 insert into public.hq_orbit_pilots(owner_hash,tag,miles,seconds) values(p_owner,p_tag,p_miles,p_seconds)
 on conflict(owner_hash) do update set tag=excluded.tag,miles=greatest(hq_orbit_pilots.miles,excluded.miles),seconds=greatest(hq_orbit_pilots.seconds,excluded.seconds),updated_at=now() returning * into result;
 return jsonb_build_object('id',result.id,'tag',result.tag,'miles',result.miles,'seconds',result.seconds);
end $$;
revoke all on function public.hq_orbit_save(text,text,text,bigint,bigint,boolean) from public,anon,authenticated;
grant execute on function public.hq_orbit_save(text,text,text,bigint,bigint,boolean) to service_role;
comment on table public.hq_orbit_pilots is 'Explicitly published, self-reported fictional mileage snapshots. Edge service only; public projection excludes owner hashes. Browser-owned pilot identity, not an account.';
