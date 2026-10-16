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

With both values configured, route status changes and new reports are read and broadcast through Supabase Realtime; local storage remains available as a cache and offline fallback. The schema grants public, anonymous read access and permits anonymous community status/report submissions for this prototype. For a production deployment, add user authentication, rate limits, moderation, and Supabase Storage for photo files instead of storing compressed photo data in the report table.

## Data model

All map data lives in `src/data`:

- `campusLocations.js` — places (type, emoji, colour, coordinates, optional `nodeId`). Places more than 120 m from any footpath are shown faded on the map and marked "not mapped yet" until paths are added near them.
- `campusPaths.js` — the walking graph (`campusNodes` + `campusPaths`). Replace with surveyed footpaths; nothing else needs to change.
- `reportTypes.js` / `campusReports.js` — report categories (and their effect on routing) plus seed reports.

Logic lives in `src/services`: `routingService.js` (Dijkstra with step-free rules and report-aware rerouting) and `reportService.js` (report lifecycle: active, resolved, expired). Reports are stored in this browser's local storage and, when Supabase is configured, synced through the `path_reports` table.

Currently only the Mahallah Uthman paths are mapped, so routes work between Mahallah Uthman Cafe and Mahallah Uthman PG. OpenStreetMap tiles need an internet connection.
