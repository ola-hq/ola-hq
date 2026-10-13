-- Applied to Supabase Ola HQ on Oct 12, 2026. Extends allowed idempotent scheduled festival notification IDs.
-- Existing receipts and timestamps are retained.
alter table public.loda_push_schedule drop constraint if exists loda_push_schedule_event_id_check;
alter table public.loda_push_schedule add constraint loda_push_schedule_event_id_check
  check (event_id = any(array['welcome', 'seating', 'seating-final', 'gates', 'mirror', 'sunset', 'entrance', 'group-photo-perreo', 'desserts', 'couple-photo', 'time-machine', 'midnight-last-call', 'afters-self-serve', 'tornaboda']));
