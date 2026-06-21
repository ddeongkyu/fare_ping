# FarePing

Flight price alert app prototype built with Expo and React Native.

FarePing is a portfolio project exploring a Korean-first flight fare alert product. Users choose departure and arrival airports, trip type, target price, stopover preferences, and baggage conditions. The app then shows saved alerts, notification-style updates, and an affiliate handoff flow.

[Live Demo](https://ddeongkyu.github.io/fare_ping/)

![FarePing app home](./assets/fareping-rn-app-home.png)

## Why This Project

People who search for cheap flights often repeat the same manual workflow: open Google Flights, Skyscanner, or airline pages, re-enter dates and routes, compare prices, then check again later. FarePing turns that repeated search into a saved alert workflow.

This repository focuses on the product and frontend foundation:

- Korean-first route and airport selection
- Flight alert creation flow
- Target price helper with previous-year price trend UI
- Stopover and baggage conditions
- Notification inbox and alert detail screens
- Affiliate-link handoff architecture without committing private tokens

## Tech Stack

- Expo
- React Native
- React Native Web
- React Native SVG
- lucide-react-native

## Project Structure

```text
.
├── App.js                         # Expo entry UI and screen composition
├── src
│   ├── AppRoot.js                  # App state and screen switching
│   ├── components                  # Reusable UI and alert form controls
│   ├── config/appConfig.js         # Public client config
│   ├── data/flightData.js          # Mock flight, airport, and chart data
│   ├── domain/flightAlerts.js      # Alert creation, validation, and formatting
│   ├── navigation/BottomNav.js     # Bottom tab navigation
│   ├── screens                     # Home, create, detail, and notifications
│   ├── services/affiliate.js       # Affiliate handoff URL builder
│   └── theme                       # Colors and shared React Native styles
├── scripts/test-aviasales-api.mjs  # Local API validation helper
├── supabase/sql                    # Ordered Supabase schema setup files
├── assets                          # Portfolio screenshots and visual assets
└── mockups.html                    # Static web/app mockup board
```

## Run Locally

```bash
npm install
npm run web -- --port 8081
```

Open [http://localhost:8081](http://localhost:8081).

## Useful Scripts

```bash
npm run web
npm run build:pages
npm run check
npm run test:aviasales
```

`test:aviasales` requires a local API token:

```bash
TRAVELPAYOUTS_TOKEN=your_token_here npm run test:aviasales -- --month=2026-09 --currency=krw --market=kr
```

Do not commit API tokens. This project intentionally keeps API credentials out of the client app.

## Environment

Copy `.env.example` to `.env` if you want to override the public affiliate handoff URL.

```bash
EXPO_PUBLIC_FAREPING_AFFILIATE_URL=https://www.aviasales.com/
```

For a real product, flight API tokens and scheduled price checks should live in a backend or serverless function, not inside the mobile app.

## Current Status

This is a frontend/product prototype, not a production release.

Done:

- App shell and bottom navigation
- Home, create alert, notification inbox, and detail screens
- In-memory alert creation and notification summary
- Portfolio-ready public repo cleanup
- Ordered Supabase SQL schema for auth profiles, fare alerts, fare observations, notifications, and RLS

Next:

- Supabase auth and user alert persistence
- Scheduled fare checking with server-side API token storage
- Push/email notification pipeline
- Real route/date form inputs
- Production build setup with EAS

## Security Notes

- `.env` files are ignored by Git.
- The default affiliate URL is a public placeholder.
- Travelpayouts/Aviasales API tokens should only be used through secure backend infrastructure.
