# Edge Function Deploy Notes

The Expo app must never contain Travelpayouts or service role credentials. Fare checks run through the Supabase Edge Function in `supabase/functions/check-fares`.

Current project ref:

```bash
zvtedscvvwwkcdmvfgro
```

Live function URL after deploy:

```bash
https://zvtedscvvwwkcdmvfgro.supabase.co/functions/v1/check-fares
```

## Required Secrets

Create a local secret file from the example. This file is ignored by Git.

```bash
cp supabase/.env.example supabase/.env.edge.local
```

Fill:

- `TRAVELPAYOUTS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FAREPING_CRON_SECRET`

Use a long random value for `FAREPING_CRON_SECRET`.

## Deploy

```bash
npm run edge:preflight
npx supabase login
npx supabase link --project-ref zvtedscvvwwkcdmvfgro
npm run edge:secrets:set
npm run edge:deploy
```

Official Supabase docs note that function-level config such as `verify_jwt = false` is read from `supabase/config.toml`, and the CLI can deploy with API mode without Docker.

## Manual Smoke Test

Before this test, create at least one active fare alert in the app. If there are no due active alerts, a successful response can still return `checked: 0`.

```bash
npm run edge:invoke -- --limit=1
```

Equivalent curl:

```bash
curl -X POST 'https://zvtedscvvwwkcdmvfgro.supabase.co/functions/v1/check-fares?limit=1' \
  -H "Authorization: Bearer $FAREPING_CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Possible successful result:

```json
{
  "checked": 1,
  "results": []
}
```

`checked` can be `0` when no active alert is due. `results` may contain an error when Aviasales has no cached data or the token is invalid. The important first check is that the function can read due active alerts and create a `fare_search_jobs` row.

Useful SQL checks after invoking:

```sql
select id, status, result_count, error_message, created_at
from fare_search_jobs
order by created_at desc
limit 10;

select origin_iata, destination_iata, price_amount, currency, created_at
from fare_observations
order by created_at desc
limit 10;

select notification_type, status, title, created_at
from alert_notifications
order by created_at desc
limit 10;
```

## Schedule

After the function is deployed and manually verified, use `supabase/sql/008_optional_schedule_edge_function.sql` as the template for `pg_cron` + `pg_net`.

Replace:

- `CRON_SECRET`

Then run the SQL in Supabase SQL Editor.
