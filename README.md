# APSRTC Live

A modern passenger-first web application for planning journeys across Andhra Pradesh and reaching official APSRTC services.

## Current capabilities
- Responsive passenger dashboard and journey search interface.
- Route discovery entry points and service information placeholders.
- Official APSRTC Live Track and ticket-booking links.
- Explicit live GPS connection status; no simulated vehicles, fake ETAs, or fabricated schedules.
- API status endpoint at `/api/live-status`.
- PWA manifest and Vercel-ready Next.js setup.

## Live GPS: authorization required
APSRTC operates GPS-enabled bus tracking infrastructure, but this project does not assume that a public third-party API is available. Before showing vehicle positions:
1. Obtain written authorization from APSRTC.
2. Obtain the official API documentation, authentication method, permitted use, rate limits, and data-retention terms.
3. Configure `APSRTC_LIVE_API_URL` and `APSRTC_LIVE_API_KEY` in Vercel.
4. Implement and validate the provider adapter against the approved contract.
5. Display source and last-updated time with every live result.

Until then, the UI clearly marks live GPS as unavailable and links passengers to APSRTC's official tracker.

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
