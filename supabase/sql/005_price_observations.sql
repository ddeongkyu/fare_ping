-- FarePing server-side search jobs, observed fares, and flight segment history.
-- Run after 004_fare_alerts.sql.

create table if not exists public.fare_search_jobs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.fare_alerts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.provider_code not null default 'aviasales',
  status public.search_job_status not null default 'queued',
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  result_count integer not null default 0,
  error_code text,
  error_message text,
  request_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fare_search_jobs_result_count check (result_count >= 0),
  constraint fare_search_jobs_time_order check (
    (started_at is null or scheduled_for <= started_at)
    and (finished_at is null or started_at is not null)
    and (started_at is null or finished_at is null or started_at <= finished_at)
  ),
  constraint fare_search_jobs_error_length check (
    (error_code is null or char_length(error_code) <= 80)
    and (error_message is null or char_length(error_message) <= 1000)
  )
);

comment on table public.fare_search_jobs is 'Server-created job log for scheduled or manual fare checks.';

drop trigger if exists set_fare_search_jobs_updated_at on public.fare_search_jobs;
create trigger set_fare_search_jobs_updated_at
before update on public.fare_search_jobs
for each row execute function public.set_updated_at();

create or replace function public.sync_fare_search_job_owner()
returns trigger
language plpgsql
as $$
declare
  owner_id uuid;
begin
  select a.user_id
  into owner_id
  from public.fare_alerts a
  where a.id = new.alert_id;

  if owner_id is null then
    raise exception 'fare_alert % does not exist', new.alert_id;
  end if;

  new.user_id = owner_id;
  return new;
end;
$$;

drop trigger if exists sync_fare_search_job_owner on public.fare_search_jobs;
create trigger sync_fare_search_job_owner
before insert or update of alert_id on public.fare_search_jobs
for each row execute function public.sync_fare_search_job_owner();

create table if not exists public.fare_observations (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.fare_alerts(id) on delete cascade,
  search_job_id uuid references public.fare_search_jobs(id) on delete set null,
  provider public.provider_code not null default 'aviasales',
  provider_offer_id text,
  origin_iata char(3) not null references public.airports(iata_code),
  destination_iata char(3) not null references public.airports(iata_code),
  departure_at timestamptz not null,
  return_at timestamptz,
  price_amount integer not null,
  currency char(3) not null default 'KRW',
  is_direct boolean not null,
  stop_count smallint not null default 0,
  total_duration_minutes integer,
  carry_on_bag_included boolean,
  checked_bag_included boolean,
  booking_url text,
  deep_link_url text,
  raw_offer jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  found_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fare_observations_route_not_same check (origin_iata <> destination_iata),
  constraint fare_observations_price_positive check (price_amount > 0),
  constraint fare_observations_currency_code check (public.assert_currency_code(currency)),
  constraint fare_observations_stop_count check (stop_count between 0 and 4),
  constraint fare_observations_direct_consistency check (
    (is_direct = true and stop_count = 0)
    or (is_direct = false and stop_count >= 1)
  ),
  constraint fare_observations_duration_positive check (total_duration_minutes is null or total_duration_minutes > 0),
  constraint fare_observations_return_after_departure check (return_at is null or departure_at <= return_at),
  constraint fare_observations_url_length check (
    (booking_url is null or char_length(booking_url) <= 2000)
    and (deep_link_url is null or char_length(deep_link_url) <= 2000)
  )
);

comment on table public.fare_observations is 'Observed fare offers captured by server-side provider checks.';

create or replace function public.validate_fare_observation_matches_alert()
returns trigger
language plpgsql
as $$
declare
  expected_origin char(3);
  expected_destination char(3);
begin
  select a.origin_iata, a.destination_iata
  into expected_origin, expected_destination
  from public.fare_alerts a
  where a.id = new.alert_id;

  if expected_origin is null then
    raise exception 'fare_alert % does not exist', new.alert_id;
  end if;

  if new.origin_iata <> expected_origin or new.destination_iata <> expected_destination then
    raise exception 'fare observation route %-% does not match alert route %-%',
      new.origin_iata, new.destination_iata, expected_origin, expected_destination;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_fare_observation_matches_alert on public.fare_observations;
create trigger validate_fare_observation_matches_alert
before insert or update of alert_id, origin_iata, destination_iata on public.fare_observations
for each row execute function public.validate_fare_observation_matches_alert();

create table if not exists public.flight_segments (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.fare_observations(id) on delete cascade,
  sequence smallint not null,
  marketing_carrier_iata char(2),
  operating_carrier_iata char(2),
  flight_number text,
  origin_iata char(3) not null references public.airports(iata_code),
  destination_iata char(3) not null references public.airports(iata_code),
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  duration_minutes integer,
  origin_terminal text,
  destination_terminal text,
  baggage_allowance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint flight_segments_sequence_positive check (sequence > 0),
  constraint flight_segments_route_not_same check (origin_iata <> destination_iata),
  constraint flight_segments_time_order check (departure_at < arrival_at),
  constraint flight_segments_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint flight_segments_carrier_codes check (
    (marketing_carrier_iata is null or marketing_carrier_iata ~ '^[A-Z0-9]{2}$')
    and (operating_carrier_iata is null or operating_carrier_iata ~ '^[A-Z0-9]{2}$')
  ),
  constraint flight_segments_flight_number_length check (flight_number is null or char_length(flight_number) <= 20),
  unique (observation_id, sequence)
);

comment on table public.flight_segments is 'Optional segment-level itinerary details for observed fares.';

create index if not exists idx_fare_search_jobs_alert_scheduled
  on public.fare_search_jobs(alert_id, scheduled_for desc);

create index if not exists idx_fare_search_jobs_status_due
  on public.fare_search_jobs(status, scheduled_for);

create index if not exists idx_fare_observations_alert_observed
  on public.fare_observations(alert_id, observed_at desc);

create index if not exists idx_fare_observations_route_date_price
  on public.fare_observations(origin_iata, destination_iata, departure_at, price_amount);

create index if not exists idx_fare_observations_raw_offer_gin
  on public.fare_observations using gin (raw_offer);

create index if not exists idx_flight_segments_observation_sequence
  on public.flight_segments(observation_id, sequence);
