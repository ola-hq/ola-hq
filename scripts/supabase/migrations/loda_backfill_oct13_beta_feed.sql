-- One-time, idempotent recovery of the already-accepted Oct 13 group beta push.
-- Its exact bilingual payload was confirmed in the deployed loda-festival-push v9.
insert into public.loda_festival_notification_history (
  id,title_en,title_es,body_en,body_es,published_at,kind,provider_notification_id
)
select
  'beta-2026-10-13', 'LA OLA DE AMOR 🌊🔔', 'LA OLA DE AMOR 🌊🔔',
  'If you''re reading this, IT WORKED! 😂 Just making sure a little festival magic is reaching you. So far, so good! 🤫 Don''t mention this alert in the chat just yet. Instead, drop a GIF showing what you expect to look like by the end of La Ola de Amor. That''s how we''ll know you got it. The celebration is almost here! 🌊',
  '¡Si estás leyendo esto, FUNCIONÓ! 😂 Solo queremos asegurarnos de que te esté llegando un poquito de magia del festival. ¡Hasta ahora, todo bien! 🤫 Todavía no menciones esta alerta en el chat. Mejor manda un GIF de cómo crees que vas a estar al final de La Ola de Amor. Así sabremos que te llegó. ¡La celebración ya casi está aquí! 🌊',
  accepted_at, 'beta', provider_notification_id
from public.loda_push_beta_runs
where local_date = date '2026-10-13'
on conflict (id) do nothing;
