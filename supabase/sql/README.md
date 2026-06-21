# FarePing Supabase SQL

Run these files in order from the Supabase SQL Editor.

1. `001_extensions_enums_functions.sql`
2. `002_reference_data.sql`
3. `003_profiles_notification_channels.sql`
4. `004_fare_alerts.sql`
5. `005_price_observations.sql`
6. `006_notifications_clicks.sql`
7. `007_rls_policies.sql`

The schema is designed for a portfolio/MVP that can later grow into:

- user-owned fare alerts
- route/date/stopover/baggage conditions
- server-side fare checks
- price observation history
- push/email notification records
- affiliate click attribution

Do not store Travelpayouts or Aviasales API tokens in these tables. Keep API tokens in Supabase Edge Function secrets.

