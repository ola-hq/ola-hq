-- Applied to Ola HQ Supabase production on October 13, 2026.
-- Corrects the original 14-ID check constraint that rejected the first of
-- the 31 approved scheduled notifications AFTER provider acceptance.
-- The receipt table remains protected by RLS and the same primary key.
alter table public.loda_push_schedule
  drop constraint loda_push_schedule_event_id_check;
alter table public.loda_push_schedule
  add constraint loda_push_schedule_event_id_check
    check (event_id in ('thursday-setup-party', 'wedding-day', 'on-the-way', 'welcome', 'seating', 'seating-final', 'gates', 'love-bri', 'explore-plaza', 'mirror', 'love-jon', 'memory-walls', 'sunset', 'formal-soon', 'entrance', 'desserts', 'mirror-again', 'couple-photo', 'time-machine', 'love-our-people', 'keep-dancing', 'midnight-last-call', 'water-and-bar', 'afters-self-serve', 'neon-last-wave', 'wake-up', 'tornaboda', 'afterglow', 'love-together', 'tornaboda-photo', 'thank-you'));
