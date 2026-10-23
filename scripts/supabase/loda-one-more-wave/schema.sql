create table public.loda_one_more_wave_responses (
 id uuid primary key,
 created_at timestamptz not null default now(),
 language text not null check (language in ('en','es')),
 moment text not null default '' check (length(moment)<=3000),
 connection text not null default '' check (length(connection)<=3000),
 difficulties text not null default '' check (length(difficulties)<=3000),
 keep_change text not null default '' check (length(keep_change)<=3000),
 missed_details text not null default '' check (length(missed_details)<=3000),
 future_interest text not null default '' check (future_interest in ('','interested','maybe','from_home')),
 worth_trip text not null default '' check (length(worth_trip)<=3000),
 guest_name text not null default '' check (length(guest_name)<=120),
 contact text not null default '' check (length(contact)<=320),
 follow_memories boolean not null default false,
 follow_gatherings boolean not null default false,
 ip_bucket text not null check (length(ip_bucket)=64),
 constraint one_more_wave_has_answer check (length(trim(moment||connection||difficulties||keep_change||missed_details||worth_trip))>0 or future_interest<>''),
 constraint one_more_wave_contact_consent check (contact='' or follow_memories or follow_gatherings)
);
alter table public.loda_one_more_wave_responses enable row level security;
revoke all on public.loda_one_more_wave_responses from public,anon,authenticated;
grant select,insert,delete on public.loda_one_more_wave_responses to service_role;
create index loda_one_more_wave_bucket_time on public.loda_one_more_wave_responses (ip_bucket,created_at desc);
create function public.loda_save_one_more_wave(p_record jsonb) returns text
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_record->>'ip_bucket',0));
 if exists(select 1 from public.loda_one_more_wave_responses where id=(p_record->>'id')::uuid) then return 'saved'; end if;
 if (select count(*) from public.loda_one_more_wave_responses where ip_bucket=p_record->>'ip_bucket' and created_at>now()-interval '10 minutes')>=20 then return 'rate_limited'; end if;
 insert into public.loda_one_more_wave_responses(id,language,moment,connection,difficulties,keep_change,missed_details,future_interest,worth_trip,guest_name,contact,follow_memories,follow_gatherings,ip_bucket)
 values ((p_record->>'id')::uuid,p_record->>'language',p_record->>'moment',p_record->>'connection',p_record->>'difficulties',p_record->>'keep_change',p_record->>'missed_details',p_record->>'future_interest',p_record->>'worth_trip',p_record->>'guest_name',p_record->>'contact',(p_record->>'follow_memories')::boolean,(p_record->>'follow_gatherings')::boolean,p_record->>'ip_bucket');
 return 'saved';
end;
$$;
revoke all on function public.loda_save_one_more_wave(jsonb) from public,anon,authenticated;
grant execute on function public.loda_save_one_more_wave(jsonb) to service_role;
comment on table public.loda_one_more_wave_responses is 'Private One more wave guest memories and feedback. No guest read access. Review/export with an authorized Supabase account; never publish contact details.';
