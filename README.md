# APSRTC Live

A modern passenger-first web application for planning journeys across Andhra Pradesh and reaching official APSRTC services.

## Current capabilities
- Responsive passenger dashboard and journey planner interface.
- Interactive OpenStreetMap explorer with 12 Andhra Pradesh city-centre reference points; select a city marker to fill the trip planner.
- Map attribution to OpenStreetMap contributors; map markers are not represented as APSRTC depots or bus stops.
- Official-source links for ticket booking and APSRTC live tracking.
- Official APSRTC Live Track and ticket-booking links.
- Live bus positions and trip updates from an independent community GTFS-Realtime mirror, only when the feed is fresh.\n- Live bus map markers refreshed automatically every 30 seconds.\n- Feed freshness checks; positions older than 120 seconds are not shown as live.\n- No simulated vehicles, fabricated ETAs, or invented schedules.
- API status endpoint at `/api/live-status`.
- PWA manifest and Vercel-ready Next.js setup.
- GitHub Actions build validation on pushes and pull requests.

## Live data integration and source transparency

The app reads APSRTC statewide GTFS-Realtime vehicle-position and trip-update JSON feeds from the public `reclaimchennai/India_GTFS` community project through `maps.reclaim.city`.

- Vehicle positions: `https://maps.reclaim.city/apsrtc/rt/vehicle_positions.json`
- Trip updates: `https://maps.reclaim.city/apsrtc/rt/trip_updates.json`
- Feed health/freshness: `https://maps.reclaim.city/apsrtc/rt/status.json`
- Feed project and source notes: `https://github.com/reclaimchennai/India_GTFS`

The server endpoint `/api/live-status` checks the upstream feed timestamp and coordinates. It only returns vehicles as live when the newest upstream position is no more than 120 seconds old. The browser refreshes every 30 seconds. If the feed is unavailable or stale, the UI reports that state and does not display stale vehicles as live.

**Important:** This is an independent community-maintained mirror, not an APSRTC-operated or APSRTC-endorsed API. The project's APSRTC feed source lists no licence. Attribution is displayed in the app; obtain written permission/clarification from the data publisher and APSRTC before commercial use or claiming official status. APSRTC's official tracker remains the authority for passenger decisions.

Static GTFS schedules are listed by the community project but are not yet integrated into the journey search. The journey planner must continue to state that verified timetable search is not connected until a schedule integration is implemented and validated. No GPS locations, bus schedules, ETAs, or service statuses are fabricated.

## Official APSRTC links
- Website: https://apsrtc.ap.gov.in/
- Live Track: https://www.apsrtclivetrack.com/
- Online booking: https://www.apsrtconline.in/

## Local development
```bash
npm install
npm run dev
```

## Deploy
Import `Narsing-s/apsrtc-live-track` into Vercel, select Next.js, and deploy from `main`. No secrets are required for the current public-information experience.

## Contact APSRTC
Ask APSRTC for an authorized third-party GPS/API integration process and written permission before connecting this application to internal tracking services.

## Requesting authorized GPS/API access

APSRTC's official IT initiatives page confirms that its Vehicle Tracking System sends GPS coordinates to its Central Data Center and that passenger access is provided through its Live Track app and web portal. This confirms the existence of the tracking system, **not** public third-party API availability.

For an integration request, start with the official contacts listed by APSRTC:
- Chief Engineer (IT): **ceit@apsrtc.ap.gov.in** | 9100667958
- Executive Director (IT): **edenit@apsrtc.ap.gov.in** | 9154104411
- APSRTC IT app support shown on the official Live Track app listing: **atm2comp@apsrtc.ap.gov.in**

Ask for written approval, a developer/sandbox API, authentication and rate-limit documentation, allowed fields, attribution requirements, security requirements, and production access terms. Do not reverse-engineer or reuse private app endpoints.

Official references:
- APSRTC Vehicle Tracking System: https://www.apsrtc.ap.gov.in/itinitiatives.php
- APSRTC Corporate Office contacts: https://www.apsrtc.ap.gov.in/Corporate_Office.php
- APSRTC official site: https://apsrtc.ap.gov.in/

A request email template is available at [docs/APSRTC-API-ACCESS-REQUEST.md](docs/APSRTC-API-ACCESS-REQUEST.md).
