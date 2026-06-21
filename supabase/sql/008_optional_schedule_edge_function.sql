-- Optional FarePing scheduled fare checks.
-- Run only after deploying supabase/functions/check-fares and setting the required secrets.
--
-- Required Edge Function secrets:
--   TRAVELPAYOUTS_TOKEN
--   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
--   FAREPING_CRON_SECRET
--
-- Supabase's hosted scheduler uses pg_cron with pg_net to call Edge Functions.
-- Keep this file as a template: replace the placeholders before running.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Example only. Replace PROJECT_REF and CRON_SECRET before uncommenting.
--
-- select cron.schedule(
--   'fareping-check-fares-every-30-minutes',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://zvtedscvvwwkcdmvfgro.supabase.co/functions/v1/check-fares?limit=20',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To remove the schedule later:
-- select cron.unschedule('fareping-check-fares-every-30-minutes');
