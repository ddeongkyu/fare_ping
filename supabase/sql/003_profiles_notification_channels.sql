-- FarePing user profile and notification channel tables.
-- Run after 002_reference_data.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale public.locale_code not null default 'ko-KR',
  timezone text not null default 'Asia/Seoul',
  preferred_currency char(3) not null default 'KRW',
  marketing_opt_in boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_currency_code check (public.assert_currency_code(preferred_currency))
);

comment on table public.profiles is 'One profile row per Supabase auth user.';

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_type public.notification_channel_type not null,
  destination text not null,
  label text,
  is_enabled boolean not null default true,
  is_verified boolean not null default false,
  verified_at timestamptz,
  last_used_at timestamptz,
  failure_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_channels_destination_length check (char_length(destination) between 3 and 500),
  constraint notification_channels_label_length check (label is null or char_length(label) <= 80),
  constraint notification_channels_failure_count_nonnegative check (failure_count >= 0),
  constraint notification_channels_verified_at_consistency check (
    (is_verified = false and verified_at is null)
    or (is_verified = true and verified_at is not null)
  ),
  unique (user_id, channel_type, destination)
);

comment on table public.notification_channels is 'User-owned email, push, or SMS destinations for future alert delivery.';

drop trigger if exists set_notification_channels_updated_at on public.notification_channels;
create trigger set_notification_channels_updated_at
before update on public.notification_channels
for each row execute function public.set_updated_at();

create index if not exists idx_notification_channels_user_enabled
  on public.notification_channels(user_id, is_enabled, channel_type);

