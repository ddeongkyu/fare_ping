-- FarePing Supabase setup: extensions, enums, and shared trigger functions.
-- Run first.

create extension if not exists pgcrypto;

do $$
begin
  create type public.locale_code as enum ('ko-KR', 'en-US', 'ja-JP', 'fr-FR');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.trip_type as enum ('one_way', 'round_trip');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cabin_class as enum ('economy', 'premium_economy', 'business', 'first');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.alert_status as enum ('active', 'paused', 'triggered', 'expired', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_channel_type as enum ('email', 'push', 'sms');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'read', 'dismissed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum ('target_met', 'price_drop', 'watch_update', 'system');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.provider_code as enum ('aviasales', 'travelpayouts', 'manual', 'mock');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.search_job_status as enum ('queued', 'running', 'succeeded', 'failed', 'skipped');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.assert_iata_code(value text)
returns boolean
language sql
immutable
as $$
  select value ~ '^[A-Z]{3}$';
$$;

create or replace function public.assert_currency_code(value text)
returns boolean
language sql
immutable
as $$
  select value ~ '^[A-Z]{3}$';
$$;

