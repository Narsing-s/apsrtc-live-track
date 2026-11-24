import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const headers = { "User-Agent": "APSRTCLive/1.0 (passenger journey discovery)", "Accept-Language": "en" };

  try {
    if (q && q.length >= 2) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "7");
      url.searchParams.set("countrycodes", "in");
      const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error("Place search is temporarily unavailable.");
      const data = await response.json();
      return NextResponse.json({ results: Array.isArray(data) ? data.map((p: Record<string, unknown>) => ({
        id: String(p.place_id), name: String(p.name || p.display_name || "Place"),
        displayName: String(p.display_name || p.name || "Place"),
        lat: Number(p.lat), lon: Number(p.lon), type: String(p.type || p.class || "place")
      })) : [] }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
    }

    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 38 && lon >= 67 && lon <= 98) {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(lat)); url.searchParams.set("lon", String(lon));
      url.searchParams.set("format", "jsonv2");
      const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error("Address lookup is temporarily unavailable.");
      const data = await response.json();
      return NextResponse.json({ name: data.name || data.display_name || "Your location", displayName: data.display_name || "Your location" });
    }
    return NextResponse.json({ error: "Provide a search query or valid coordinates." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Place lookup failed." }, { status: 502 });
  }
}
