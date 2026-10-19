create extension if not exists pg_cron;
-- Whole-hour local zones: execute at noon in TW, VM and MX, catch up after downtime.
select cron.schedule('qr18-03-company-calendar-auto-stops','0 * * * *',$job$select public.run_calendar_auto_stops();$job$);
