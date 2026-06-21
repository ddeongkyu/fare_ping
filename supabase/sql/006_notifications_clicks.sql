-- FarePing notification records and affiliate click attribution.
-- Run after 005_price_observations.sql.

create table if not exists public.alert_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_id uuid references public.fare_alerts(id) on delete cascade,
  observation_id uuid references public.fare_observations(id) on delete set null,
  channel_id uuid references public.notification_channels(id) on delete set null,
  notification_type public.notification_type not null,
  channel_type public.notification_channel_type,
  status public.notification_status not null default 'pending',
  title text not null,
  body text not null,
  action_url text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_notifications_title_length check (char_length(title) between 1 and 120),
  constraint alert_notifications_body_length check (char_length(body) between 1 and 1000),
  constraint alert_notifications_url_length check (action_url is null or char_length(action_url) <= 2000),
  constraint alert_notifications_time_consistency check (
    (sent_at is null or created_at <= sent_at)
    and (read_at is null or sent_at is null or sent_at <= read_at)
    and (dismissed_at is null or created_at <= dismissed_at)
  )
);

comment on table public.alert_notifications is 'Notification inbox and delivery records for fare alerts.';

drop trigger if exists set_alert_notifications_updated_at on public.alert_notifications;
create trigger set_alert_notifications_updated_at
before update on public.alert_notifications
for each row execute function public.set_updated_at();

create or replace function public.validate_alert_notification_owner()
returns trigger
language plpgsql
as $$
declare
  owner_from_alert uuid;
  owner_from_channel uuid;
begin
  if new.alert_id is not null then
    select a.user_id
    into owner_from_alert
    from public.fare_alerts a
    where a.id = new.alert_id;

    if owner_from_alert is null then
      raise exception 'fare_alert % does not exist', new.alert_id;
    end if;

    if new.user_id <> owner_from_alert then
      raise exception 'notification user_id must match alert owner';
    end if;
  end if;

  if new.channel_id is not null then
    select c.user_id
    into owner_from_channel
    from public.notification_channels c
    where c.id = new.channel_id;

    if owner_from_channel is null then
      raise exception 'notification_channel % does not exist', new.channel_id;
    end if;

    if new.user_id <> owner_from_channel then
      raise exception 'notification user_id must match channel owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_alert_notification_owner on public.alert_notifications;
create trigger validate_alert_notification_owner
before insert or update of user_id, alert_id, channel_id on public.alert_notifications
for each row execute function public.validate_alert_notification_owner();

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  alert_id uuid references public.fare_alerts(id) on delete set null,
  observation_id uuid references public.fare_observations(id) on delete set null,
  provider public.provider_code not null default 'aviasales',
  target_url text not null,
  referrer text,
  user_agent text,
  client_platform text,
  metadata jsonb not null default '{}'::jsonb,
  clicked_at timestamptz not null default now(),
  constraint affiliate_clicks_url_length check (char_length(target_url) between 8 and 2000),
  constraint affiliate_clicks_referrer_length check (referrer is null or char_length(referrer) <= 2000),
  constraint affiliate_clicks_user_agent_length check (user_agent is null or char_length(user_agent) <= 1000),
  constraint affiliate_clicks_client_platform_length check (client_platform is null or char_length(client_platform) <= 80)
);

comment on table public.affiliate_clicks is 'Client-recorded outbound affiliate handoff clicks.';

create or replace function public.validate_affiliate_click_owner()
returns trigger
language plpgsql
as $$
declare
  owner_from_alert uuid;
  owner_from_observation uuid;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.alert_id is not null then
    select a.user_id
    into owner_from_alert
    from public.fare_alerts a
    where a.id = new.alert_id;

    if owner_from_alert is null then
      raise exception 'fare_alert % does not exist', new.alert_id;
    end if;

    if new.user_id <> owner_from_alert then
      raise exception 'affiliate click user_id must match alert owner';
    end if;
  end if;

  if new.observation_id is not null then
    select a.user_id
    into owner_from_observation
    from public.fare_observations o
    join public.fare_alerts a on a.id = o.alert_id
    where o.id = new.observation_id;

    if owner_from_observation is null then
      raise exception 'fare_observation % does not exist', new.observation_id;
    end if;

    if new.user_id <> owner_from_observation then
      raise exception 'affiliate click user_id must match observation owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_affiliate_click_owner on public.affiliate_clicks;
create trigger validate_affiliate_click_owner
before insert or update of user_id, alert_id, observation_id on public.affiliate_clicks
for each row execute function public.validate_affiliate_click_owner();

create index if not exists idx_alert_notifications_user_created
  on public.alert_notifications(user_id, created_at desc);

create index if not exists idx_alert_notifications_alert
  on public.alert_notifications(alert_id, created_at desc);

create index if not exists idx_alert_notifications_pending
  on public.alert_notifications(status, created_at)
  where status = 'pending';

create index if not exists idx_affiliate_clicks_user_clicked
  on public.affiliate_clicks(user_id, clicked_at desc);

create index if not exists idx_affiliate_clicks_alert_clicked
  on public.affiliate_clicks(alert_id, clicked_at desc);
