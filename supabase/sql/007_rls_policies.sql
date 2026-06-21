-- FarePing row-level security and grants.
-- Run last, after 006_notifications_clicks.sql.

alter table public.countries enable row level security;
alter table public.airports enable row level security;
alter table public.route_price_baselines enable row level security;
alter table public.profiles enable row level security;
alter table public.notification_channels enable row level security;
alter table public.fare_alerts enable row level security;
alter table public.fare_alert_layover_rules enable row level security;
alter table public.fare_search_jobs enable row level security;
alter table public.fare_observations enable row level security;
alter table public.flight_segments enable row level security;
alter table public.alert_notifications enable row level security;
alter table public.affiliate_clicks enable row level security;

grant usage on schema public to anon, authenticated;

grant select on public.countries to anon, authenticated;
grant select on public.airports to anon, authenticated;
grant select on public.route_price_baselines to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.notification_channels to authenticated;
grant select, insert, update, delete on public.fare_alerts to authenticated;
grant select, insert, update, delete on public.fare_alert_layover_rules to authenticated;
grant select on public.fare_search_jobs to authenticated;
grant select on public.fare_observations to authenticated;
grant select on public.flight_segments to authenticated;
grant select on public.alert_notifications to authenticated;
grant update (status, read_at, dismissed_at, updated_at) on public.alert_notifications to authenticated;
grant select, insert on public.affiliate_clicks to authenticated;

drop policy if exists "Reference countries are readable" on public.countries;
create policy "Reference countries are readable"
on public.countries
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Reference airports are readable" on public.airports;
create policy "Reference airports are readable"
on public.airports
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Route baselines are readable" on public.route_price_baselines;
create policy "Route baselines are readable"
on public.route_price_baselines
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can manage own notification channels" on public.notification_channels;
create policy "Users can manage own notification channels"
on public.notification_channels
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read own fare alerts" on public.fare_alerts;
create policy "Users can read own fare alerts"
on public.fare_alerts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own fare alerts" on public.fare_alerts;
create policy "Users can insert own fare alerts"
on public.fare_alerts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own fare alerts" on public.fare_alerts;
create policy "Users can update own fare alerts"
on public.fare_alerts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own fare alerts" on public.fare_alerts;
create policy "Users can delete own fare alerts"
on public.fare_alerts
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can manage layover rules for own alerts" on public.fare_alert_layover_rules;
create policy "Users can manage layover rules for own alerts"
on public.fare_alert_layover_rules
for all
to authenticated
using (
  exists (
    select 1
    from public.fare_alerts a
    where a.id = fare_alert_layover_rules.alert_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.fare_alerts a
    where a.id = fare_alert_layover_rules.alert_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own search jobs" on public.fare_search_jobs;
create policy "Users can read own search jobs"
on public.fare_search_jobs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read observations for own alerts" on public.fare_observations;
create policy "Users can read observations for own alerts"
on public.fare_observations
for select
to authenticated
using (
  exists (
    select 1
    from public.fare_alerts a
    where a.id = fare_observations.alert_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can read segments for own observations" on public.flight_segments;
create policy "Users can read segments for own observations"
on public.flight_segments
for select
to authenticated
using (
  exists (
    select 1
    from public.fare_observations o
    join public.fare_alerts a on a.id = o.alert_id
    where o.id = flight_segments.observation_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own notifications" on public.alert_notifications;
create policy "Users can read own notifications"
on public.alert_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can mark own notifications" on public.alert_notifications;
create policy "Users can mark own notifications"
on public.alert_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and status in ('read', 'dismissed')
);

drop policy if exists "Users can read own affiliate clicks" on public.affiliate_clicks;
create policy "Users can read own affiliate clicks"
on public.affiliate_clicks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own affiliate clicks" on public.affiliate_clicks;
create policy "Users can insert own affiliate clicks"
on public.affiliate_clicks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    alert_id is null
    or exists (
      select 1
      from public.fare_alerts a
      where a.id = affiliate_clicks.alert_id
        and a.user_id = auth.uid()
    )
  )
);
