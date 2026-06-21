-- FarePing reference data: countries, airports, and route baseline prices.
-- Run after 001_extensions_enums_functions.sql.

create table if not exists public.countries (
  iso2 char(2) primary key,
  iso3 char(3) not null unique,
  name_ko text not null,
  name_en text not null,
  default_currency char(3) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint countries_iso2_uppercase check (iso2 ~ '^[A-Z]{2}$'),
  constraint countries_iso3_uppercase check (iso3 ~ '^[A-Z]{3}$'),
  constraint countries_currency_uppercase check (public.assert_currency_code(default_currency))
);

comment on table public.countries is 'Reference country records for airport and market metadata.';

create table if not exists public.airports (
  iata_code char(3) primary key,
  icao_code char(4),
  name_ko text not null,
  name_en text not null,
  city_ko text not null,
  city_en text not null,
  country_iso2 char(2) not null references public.countries(iso2),
  timezone text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint airports_iata_uppercase check (public.assert_iata_code(iata_code)),
  constraint airports_icao_uppercase check (icao_code is null or icao_code ~ '^[A-Z]{4}$'),
  constraint airports_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint airports_longitude_range check (longitude is null or longitude between -180 and 180)
);

comment on table public.airports is 'IATA airport reference data used by alert rules and observed fares.';

drop trigger if exists set_airports_updated_at on public.airports;
create trigger set_airports_updated_at
before update on public.airports
for each row execute function public.set_updated_at();

create table if not exists public.route_price_baselines (
  id uuid primary key default gen_random_uuid(),
  origin_iata char(3) not null references public.airports(iata_code),
  destination_iata char(3) not null references public.airports(iata_code),
  market_code text not null default 'kr',
  currency char(3) not null default 'KRW',
  travel_month date not null,
  sample_date date not null,
  avg_price_amount integer not null,
  min_price_amount integer,
  max_price_amount integer,
  sample_count integer not null default 0,
  source public.provider_code not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_price_baselines_route_not_same check (origin_iata <> destination_iata),
  constraint route_price_baselines_currency check (public.assert_currency_code(currency)),
  constraint route_price_baselines_month_start check (travel_month = date_trunc('month', travel_month)::date),
  constraint route_price_baselines_prices_positive check (
    avg_price_amount > 0
    and (min_price_amount is null or min_price_amount > 0)
    and (max_price_amount is null or max_price_amount > 0)
    and (min_price_amount is null or max_price_amount is null or min_price_amount <= max_price_amount)
  ),
  constraint route_price_baselines_sample_count_nonnegative check (sample_count >= 0),
  unique (origin_iata, destination_iata, market_code, currency, travel_month, sample_date, source)
);

comment on table public.route_price_baselines is 'Aggregated historical prices for target price guidance charts.';

drop trigger if exists set_route_price_baselines_updated_at on public.route_price_baselines;
create trigger set_route_price_baselines_updated_at
before update on public.route_price_baselines
for each row execute function public.set_updated_at();

create index if not exists idx_airports_country_active on public.airports(country_iso2, is_active);
create index if not exists idx_route_price_baselines_route_month
  on public.route_price_baselines(origin_iata, destination_iata, travel_month, currency);

insert into public.countries (iso2, iso3, name_ko, name_en, default_currency)
values
  ('KR', 'KOR', '대한민국', 'South Korea', 'KRW'),
  ('JP', 'JPN', '일본', 'Japan', 'JPY'),
  ('CA', 'CAN', '캐나다', 'Canada', 'CAD'),
  ('FR', 'FRA', '프랑스', 'France', 'EUR'),
  ('TW', 'TWN', '대만', 'Taiwan', 'TWD'),
  ('HK', 'HKG', '홍콩', 'Hong Kong', 'HKD'),
  ('SG', 'SGP', '싱가포르', 'Singapore', 'SGD'),
  ('GB', 'GBR', '영국', 'United Kingdom', 'GBP'),
  ('US', 'USA', '미국', 'United States', 'USD')
on conflict (iso2) do update set
  iso3 = excluded.iso3,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  default_currency = excluded.default_currency,
  is_active = true;

insert into public.airports (
  iata_code, icao_code, name_ko, name_en, city_ko, city_en, country_iso2, timezone, latitude, longitude
)
values
  ('ICN', 'RKSI', '인천국제공항', 'Incheon International Airport', '서울', 'Seoul', 'KR', 'Asia/Seoul', 37.460190, 126.440696),
  ('GMP', 'RKSS', '김포국제공항', 'Gimpo International Airport', '서울', 'Seoul', 'KR', 'Asia/Seoul', 37.558300, 126.790600),
  ('PUS', 'RKPK', '김해국제공항', 'Gimhae International Airport', '부산', 'Busan', 'KR', 'Asia/Seoul', 35.179501, 128.938202),
  ('NRT', 'RJAA', '나리타국제공항', 'Narita International Airport', '도쿄', 'Tokyo', 'JP', 'Asia/Tokyo', 35.764702, 140.386002),
  ('HND', 'RJTT', '하네다공항', 'Tokyo Haneda Airport', '도쿄', 'Tokyo', 'JP', 'Asia/Tokyo', 35.552299, 139.779999),
  ('KIX', 'RJBB', '간사이국제공항', 'Kansai International Airport', '오사카', 'Osaka', 'JP', 'Asia/Tokyo', 34.427299, 135.244003),
  ('FUK', 'RJFF', '후쿠오카공항', 'Fukuoka Airport', '후쿠오카', 'Fukuoka', 'JP', 'Asia/Tokyo', 33.585899, 130.451004),
  ('YVR', 'CYVR', '밴쿠버국제공항', 'Vancouver International Airport', '밴쿠버', 'Vancouver', 'CA', 'America/Vancouver', 49.193901, -123.183998),
  ('CDG', 'LFPG', '파리 샤를드골공항', 'Paris Charles de Gaulle Airport', '파리', 'Paris', 'FR', 'Europe/Paris', 49.012798, 2.550000),
  ('TPE', 'RCTP', '타오위안국제공항', 'Taiwan Taoyuan International Airport', '타이베이', 'Taipei', 'TW', 'Asia/Taipei', 25.077700, 121.232803),
  ('HKG', 'VHHH', '홍콩국제공항', 'Hong Kong International Airport', '홍콩', 'Hong Kong', 'HK', 'Asia/Hong_Kong', 22.308901, 113.915001),
  ('SIN', 'WSSS', '창이국제공항', 'Singapore Changi Airport', '싱가포르', 'Singapore', 'SG', 'Asia/Singapore', 1.350190, 103.994003),
  ('LON', null, '런던 전체 공항', 'London all airports', '런던', 'London', 'GB', 'Europe/London', null, null),
  ('PAR', null, '파리 전체 공항', 'Paris all airports', '파리', 'Paris', 'FR', 'Europe/Paris', null, null),
  ('NYC', null, '뉴욕 전체 공항', 'New York all airports', '뉴욕', 'New York', 'US', 'America/New_York', null, null)
on conflict (iata_code) do update set
  icao_code = excluded.icao_code,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  city_ko = excluded.city_ko,
  city_en = excluded.city_en,
  country_iso2 = excluded.country_iso2,
  timezone = excluded.timezone,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_active = true,
  updated_at = now();

