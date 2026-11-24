import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 6 || lat > 38 || lon < 67 || lon > 98) {
    return NextResponse.json({ error: "Valid Andhra Pradesh coordinates are required." }, { status: 400 });
  }

  const query = `[out:json][timeout:15];(node["highway"="bus_stop"](around:2000,${lat},${lon});way["highway"="bus_stop"](around:2000,${lat},${lon});node["amenity"="bus_station"](around:5000,${lat},${lon}););out center tags;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "APSRTCLive/1.0" },
      body: new URLSearchParams({ data: query }), cache: "no-store", signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error("Nearby stop service is temporarily unavailable.");
    const data = await response.json() as { elements?: Array<{
      id: number | string; tags?: Record<string, string>; lat?: number; lon?: number;
      center?: { lat?: number; lon?: number };
    }> };
    const stops = (Array.isArray(data.elements) ? data.elements : []).map(item => {
      const tags = item.tags ?? {};
      return { id: String(item.id), name: String(tags.name || tags["name:en"] || tags.ref || "Bus stop"),
        lat: Number(item.lat ?? item.center?.lat), lon: Number(item.lon ?? item.center?.lon),
        kind: tags.amenity === "bus_station" ? "Bus station" : "Bus stop" };
    }).filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));
    return NextResponse.json({ stops }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ stops: [], warning: error instanceof Error ? error.message : "Nearby stops unavailable." }, { status: 200 });
  }
}
