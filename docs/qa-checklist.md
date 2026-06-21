# FarePing QA Checklist

Use this checklist before sharing the portfolio link or recording a demo.

## Public Web Demo

- Open the live demo and confirm the home screen renders without console errors.
- Open `만들기` and confirm the default route is `인천국제공항 -> 나리타국제공항`.
- Search airports by city, airport name, and IATA code.
- Select outbound and return date ranges from the calendar cards.
- Type `150000` into target price and confirm it displays as `150,000`.
- Save a local alert while logged out and confirm it appears in the notification flow.
- Open an alert detail screen and confirm edit, pause/resume, delete, share, and affiliate buttons are visible.
- Delete an alert and confirm the confirmation modal appears before removal.

## Auth And RLS

- Sign up with a test email.
- Confirm the email if Supabase email confirmation is enabled.
- Log in and create a fare alert.
- Refresh the page and confirm the alert persists.
- Edit the target price or date range and confirm the detail screen updates.
- Pause and resume the alert.
- Delete the alert and confirm it disappears after refresh.
- Run `npm run test:supabase` and confirm:
  - reference airports are readable with the publishable key
  - anonymous fare alert reads return zero rows under RLS

## Notification Inbox

- Create a test row in `alert_notifications` for the logged-in user and alert.
- Open the notification inbox and confirm the DB notification appears.
- Open the notification and confirm it marks as read.
- Dismiss the notification and confirm it disappears from the inbox.

## Affiliate Tracking

- Log in and open an alert detail screen.
- Click `Aviasales에서 보기`.
- Confirm a row appears in `affiliate_clicks` with the alert id, target URL, platform, and metadata.

## Edge Function

- Set Supabase secrets for `TRAVELPAYOUTS_TOKEN`, service role key, and `FAREPING_CRON_SECRET`.
- Deploy `check-fares`.
- Call the function manually with a small `limit`.
- Confirm `fare_search_jobs` receives a job row.
- Confirm `fare_observations` receives an observation when the provider returns a cached offer.
- Confirm `alert_notifications` receives a pending notification when price is at or below target.
