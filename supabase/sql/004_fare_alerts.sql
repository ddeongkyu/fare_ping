-- FarePing fare alert tables.
-- Run after 003_profiles_notification_channels.sql.

create table if not exists public.fare_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  origin_iata char(3) not null references public.airports(iata_code),
  destination_iata char(3) not null references public.airports(iata_code),
  trip_type public.trip_type not null default 'round_trip',
  cabin_class public.cabin_class not null default 'economy',
  adult_count smallint not null default 1,
  child_count smallint not null default 0,
  infant_count smallint not null default 0,
  departure_date_from date not null,
  departure_date_to date not null,
  return_date_from date,
  return_date_to date,
  target_price_amount integer not null,
  target_currency char(3) not null default 'KRW',
  max_stops smallint not null default 0,
  min_layover_minutes integer,
  max_layover_minutes integer,
  max_total_duration_minutes integer,
  require_same_airport_layover boolean not null default false,
  carry_on_bag_count smallint not null default 1,
  checked_bag_count smallint not null default 0,
  notify_on_target_met boolean not null default true,
  notify_on_price_drop boolean not null default true,
  price_drop_threshold_percent numeric(5, 2) not null default 5.00,
  check_frequency_minutes integer not null default 360,
  status public.alert_status not null default 'active',
  last_checked_at timestamptz,
  next_check_at timestamptz,
  triggered_at timestamptz,
  expires_at timestamptz,
  client_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fare_alerts_route_not_same check (origin_iata <> destination_iata),
  constraint fare_alerts_passenger_counts check (
    adult_count between 1 and 9
    and child_count between 0 and 9
    and infant_count between 0 and 9
    and adult_count + child_count + infant_count between 1 and 9
  ),
  constraint fare_alerts_departure_range check (departure_date_from <= departure_date_to),
  constraint fare_alerts_return_rules check (
    (
      trip_type = 'one_way'
      and return_date_from is null
      and return_date_to is null
    )
    or (
      trip_type = 'round_trip'
      and return_date_from is not null
      and return_date_to is not null
      and return_date_from <= return_date_to
      and departure_date_from <= return_date_to
    )
  ),
  constraint fare_alerts_target_price_positive check (target_price_amount > 0),
  constraint fare_alerts_currency_code check (public.assert_currency_code(target_currency)),
  constraint fare_alerts_stop_count check (max_stops between 0 and 2),
  constraint fare_alerts_layover_range check (
    (min_layover_minutes is null or min_layover_minutes >= 0)
    and (max_layover_minutes is null or max_layover_minutes >= 0)
    and (min_layover_minutes is null or max_layover_minutes is null or min_layover_minutes <= max_layover_minutes)
  ),
  constraint fare_alerts_duration_positive check (max_total_duration_minutes is null or max_total_duration_minutes > 0),
  constraint fare_alerts_baggage_counts check (carry_on_bag_count between 0 and 3 and checked_bag_count between 0 and 3),
  constraint fare_alerts_drop_threshold check (price_drop_threshold_percent between 0 and 100),
  constraint fare_alerts_check_frequency check (check_frequency_minutes between 30 and 10080),
  constraint fare_alerts_client_note_length check (client_note is null or char_length(client_note) <= 500)
);

comment on table public.fare_alerts is 'User-owned flight price alert rules.';

drop trigger if exists set_fare_alerts_updated_at on public.fare_alerts;
create trigger set_fare_alerts_updated_at
before update on public.fare_alerts
for each row execute function public.set_updated_at();

create table if not exists public.fare_alert_layover_rules (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.fare_alerts(id) on delete cascade,
  sequence smallint not null,
  airport_iata char(3) references public.airports(iata_code),
  terminal_code text,
  min_layover_minutes integer,
  max_layover_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fare_alert_layover_rules_sequence check (sequence between 1 and 2),
  constraint fare_alert_layover_rules_terminal_length check (terminal_code is null or char_length(terminal_code) <= 20),
  constraint fare_alert_layover_rules_minutes check (
    (min_layover_minutes is null or min_layover_minutes >= 0)
    and (max_layover_minutes is null or max_layover_minutes >= 0)
    and (min_layover_minutes is null or max_layover_minutes is null or min_layover_minutes <= max_layover_minutes)
  ),
  unique (alert_id, sequence)
);

comment on table public.fare_alert_layover_rules is 'Optional per-stop layover constraints for one or two stop itineraries.';

drop trigger if exists set_fare_alert_layover_rules_updated_at on public.fare_alert_layover_rules;
create trigger set_fare_alert_layover_rules_updated_at
before update on public.fare_alert_layover_rules
for each row execute function public.set_updated_at();

create index if not exists idx_fare_alerts_user_status
  on public.fare_alerts(user_id, status, created_at desc);

create index if not exists idx_fare_alerts_due_checks
  on public.fare_alerts(status, next_check_at)
  where status = 'active';

create index if not exists idx_fare_alerts_route_dates
  on public.fare_alerts(origin_iata, destination_iata, departure_date_from, departure_date_to);

create index if not exists idx_fare_alert_layover_rules_alert
  on public.fare_alert_layover_rules(alert_id, sequence);

