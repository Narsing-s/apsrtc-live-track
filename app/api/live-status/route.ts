import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * APSRTC has not published a verified public third-party GPS API contract.
 * This endpoint intentionally returns unavailable until authorized credentials
 * and a documented provider endpoint are configured.
 */
export async function GET() {
  const configured = Boolean(process.env.APSRTC_LIVE_API_URL && process.env.APSRTC_LIVE_API_KEY);
  return NextResponse.json({
    provider: configured ? "apsrtc-authorized-provider" : "apsrtc",
    liveTracking: configured ? "configured_pending_adapter" : "unavailable",
    message: configured
      ? "Credentials are present. Complete and validate the authorized provider adapter before displaying vehicle positions."
      : "Live GPS is not connected. APSRTC authorization and documented API access are required.",
    updatedAt: null,
    vehicles: [],
    source: null
  }, { headers: { "Cache-Control": "no-store" } });
}