# Edge Function Deploy Notes

The Expo app must never contain Travelpayouts or service role credentials. Fare checks run through the Supabase Edge Function in `supabase/functions/check-fares`.

## Required Secrets

```bash
npx supabase secrets set TRAVELPAYOUTS_TOKEN=your_travelpayouts_token_here
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
npx supabase secrets set FAREPING_CRON_SECRET=replace_with_a_random_secret
```

## Deploy

```bash
npx supabase link --project-ref PROJECT_REF
npx supabase functions deploy check-fares
```

## Manual Smoke Test

```bash
curl -X POST 'https://PROJECT_REF.functions.supabase.co/check-fares?limit=1' \
  -H 'Authorization: Bearer FAREPING_CRON_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected result:

```json
{
  "checked": 1,
  "results": []
}
```

`results` may contain an error when Aviasales has no cached data or the token is invalid. The important first check is that the function can read due active alerts and create a `fare_search_jobs` row.

## Schedule

After the function is deployed and manually verified, use `supabase/sql/008_optional_schedule_edge_function.sql` as the template for `pg_cron` + `pg_net`.

Replace:

- `PROJECT_REF`
- `CRON_SECRET`

Then run the SQL in Supabase SQL Editor.
