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