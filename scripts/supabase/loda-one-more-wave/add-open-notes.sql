-- Additive update: preserve all existing responses and all access controls.
alter table public.loda_one_more_wave_responses add column notes text not null default '' check (length(notes)<=3000);
alter table public.loda_one_more_wave_responses drop constraint one_more_wave_has_answer;
alter table public.loda_one_more_wave_responses add constraint one_more_wave_has_answer check (length(trim(moment||connection||difficulties||keep_change||missed_details||worth_trip||notes))>0 or future_interest<>'');
create or replace function public.loda_save_one_more_wave(p_record jsonb) returns text
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_record->>'ip_bucket',0));
 if exists(select 1 from public.loda_one_more_wave_responses where id=(p_record->>'id')::uuid) then return 'saved'; end if;
 if (select count(*) from public.loda_one_more_wave_responses where ip_bucket=p_record->>'ip_bucket' and created_at>now()-interval '10 minutes')>=20 then return 'rate_limited'; end if;
 insert into public.loda_one_more_wave_responses(id,language,moment,connection,difficulties,keep_change,missed_details,future_interest,worth_trip,guest_name,contact,follow_memories,follow_gatherings,ip_bucket,notes)
 values ((p_record->>'id')::uuid,p_record->>'language',p_record->>'moment',p_record->>'connection',p_record->>'difficulties',p_record->>'keep_change',p_record->>'missed_details',p_record->>'future_interest',p_record->>'worth_trip',p_record->>'guest_name',p_record->>'contact',(p_record->>'follow_memories')::boolean,(p_record->>'follow_gatherings')::boolean,p_record->>'ip_bucket',coalesce(p_record->>'notes',''));
 return 'saved';
end;
$$;
revoke all on function public.loda_save_one_more_wave(jsonb) from public,anon,authenticated;
grant execute on function public.loda_save_one_more_wave(jsonb) to service_role;
