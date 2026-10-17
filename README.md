# OKtakRoute

An accessibility-first campus route planner built with Vue, Tailwind CSS, Leaflet, and OpenStreetMap. The prototype includes a walking-path graph, step-free routing, community path reports with optional photos, and automatic rerouting around active reports.

## Run locally

```sh
npm install
npm run dev
```

Routing and reports work without a backend and are saved in this browser's local storage.

## Enable Supabase realtime

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's public URL and anon key.
3. Restart the Vite dev server.

With both values configured, route status changes and new reports are read and broadcast through Supabase Realtime; local storage remains available as a cache and offline fallback. Public report reads and anonymous report creation support community reporting. Report resolution is restricted by row-level security to authenticated users whose trusted Supabase `app_metadata.role` is `council`.

### Council access

1. Run the latest [`supabase/schema.sql`](./supabase/schema.sql) to restrict report updates to council staff.
2. In Supabase Auth, provision council staff accounts; public sign-up is not used by the app.
3. For each approved account, set the trusted **app metadata** claim `{ "role": "council" }` using the Supabase dashboard or a server-side admin tool. Do not put this claim in user-editable metadata.
4. Staff choose **Council staff** from the profile popup and sign in with their provisioned email and password. The dashboard is only rendered for a session with the verified app-metadata claim.

Never use a shared staff number or client-side-only check as authentication. Keep the Supabase service-role key on a trusted server and never expose it in this Vite app. Public report reads remain available to the community; council-only access protects the dashboard route and report-resolution actions.

For a local UI demo only, set `VITE_DEMO_COUNCIL_EMAIL` and `VITE_DEMO_COUNCIL_PASSWORD` in an ignored `.env.local` file and restart Vite. Demo credentials are exposed to that local development browser and do not authenticate with Supabase or authorize remote database writes. This demo login is disabled in production builds; never use it for real council access.

## Data model

All map data lives in `src/data`:

- `campusLocations.js` — places (type, emoji, colour, coordinates, optional `nodeId`). Places more than 120 m from any footpath are shown faded on the map and marked "not mapped yet" until paths are added near them.
- `campusPaths.js` — the walking graph (`campusNodes` + `campusPaths`). Replace with surveyed footpaths; nothing else needs to change.
- `reportTypes.js` / `campusReports.js` — report categories (and their effect on routing) plus seed reports.

Logic lives in `src/services`: `routingService.js` (Dijkstra with step-free rules and report-aware rerouting) and `reportService.js` (report lifecycle: active, resolved, expired). Reports are stored in this browser's local storage and, when Supabase is configured, synced through the `path_reports` table.

Currently only the Mahallah Uthman paths are mapped, so routes work between Mahallah Uthman Cafe and Mahallah Uthman PG. OpenStreetMap tiles need an internet connection.
