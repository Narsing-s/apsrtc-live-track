import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE = "https://maps.reclaim.city/apsrtc/rt";
const MAX_FEED_AGE_SECONDS = 120;

type AnyRecord = Record<string, any>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? value as AnyRecord : {};
}

function unixSeconds(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function readJson(url: string): Promise<AnyRecord> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
  return asRecord(await response.json());
}

export async function GET() {
  try {
    const [status, positions, updates] = await Promise.all([
      readJson(`${SOURCE}/status.json`),
      readJson(`${SOURCE}/vehicle_positions.json`),
      readJson(`${SOURCE}/trip_updates.json`)
    ]);

    const feedTime = unixSeconds(status.feed_time) ??
      unixSeconds(asRecord(positions.header).timestamp);
    const now = Math.floor(Date.now() / 1000);
    const ageSeconds = feedTime ? Math.max(0, now - feedTime) : null;
    const isFresh = ageSeconds !== null && ageSeconds <= MAX_FEED_AGE_SECONDS;

    const entities = Array.isArray(positions.entity) ? positions.entity : [];
    const vehicles = isFresh ? entities.flatMap((raw: unknown) => {
      const entity = asRecord(raw);
      const vehicle = asRecord(entity.vehicle);
      const position = asRecord(vehicle.position);
      const latitude = Number(position.latitude);
      const longitude = Number(position.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          latitude < 6 || latitude > 38 || longitude < 67 || longitude > 98) return [];

      const descriptor = asRecord(vehicle.trip);
      const identity = asRecord(vehicle.vehicle);
      const timestamp = unixSeconds(vehicle.timestamp) ?? feedTime;
      const speed = Number(position.speed);
      const bearing = Number(position.bearing);
      return [{
        id: String(identity.id ?? entity.id ?? `${latitude},${longitude}`),
        label: String(identity.label ?? identity.id ?? "APSRTC bus"),
        routeId: descriptor.routeId ? String(descriptor.routeId) : null,
        tripId: descriptor.tripId ? String(descriptor.tripId) : null,
        latitude,
        longitude,
        speedKph: Number.isFinite(speed) ? Math.round(speed * 3.6) : null,
        bearing: Number.isFinite(bearing) ? bearing : null,
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null
      }];
    }) : [];

    const tripEntities = Array.isArray(updates.entity) ? updates.entity : [];
    const tripUpdates = isFresh ? tripEntities.flatMap((raw: unknown) => {
      const entity = asRecord(raw);
      const update = asRecord(entity.tripUpdate ?? entity.trip_update);
      const trip = asRecord(update.trip);
      const stops = Array.isArray(update.stopTimeUpdate) ? update.stopTimeUpdate : [];
      const nextStop = stops[0] ? asRecord(stops[0]) : {};
      const arrival = asRecord(nextStop.arrival);
      const departure = asRecord(nextStop.departure);
      const time = unixSeconds(arrival.time) ?? unixSeconds(departure.time);
      if (!trip.tripId && !trip.routeId) return [];
      return [{
        id: String(entity.id ?? trip.tripId ?? trip.routeId),
        tripId: trip.tripId ? String(trip.tripId) : null,
        routeId: trip.routeId ? String(trip.routeId) : null,
        nextStopId: nextStop.stopId ? String(nextStop.stopId) : null,
        nextStopSequence: nextStop.stopSequence ?? null,
        nextArrival: time ? new Date(time * 1000).toISOString() : null,
        delaySeconds: Number.isFinite(Number(arrival.delay ?? departure.delay))
          ? Number(arrival.delay ?? departure.delay) : null
      }];
    }) : [];

    return NextResponse.json({
      provider: "reclaim-city-community-mirror",
      source: "https://github.com/reclaimchennai/India_GTFS",
      sourceLabel: "Community-maintained APSRTC GTFS mirror (unofficial)",
      liveTracking: isFresh ? "live" : feedTime ? "stale" : "unavailable",
      message: isFresh
        ? "Live positions received from the community mirror. This is not an APSRTC-operated API."
        : "The upstream feed is missing or older than 120 seconds. No buses are shown as live.",
      updatedAt: feedTime ? new Date(feedTime * 1000).toISOString() : null,
      ageSeconds,
      vehicleCount: vehicles.length,
      upstreamVehicleCount: Number(status.vehicles ?? entities.length),
      vehicles,
      tripUpdates,
      attribution: "Data from reclaimchennai/India_GTFS via maps.reclaim.city. Not operated or endorsed by APSRTC.",
      checkedAt: new Date().toISOString()
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({
      provider: "reclaim-city-community-mirror",
      source: "https://github.com/reclaimchennai/India_GTFS",
      sourceLabel: "Community-maintained APSRTC GTFS mirror (unofficial)",
      liveTracking: "unavailable",
      message: error instanceof Error ? error.message : "Unable to retrieve the upstream live feed.",
      updatedAt: null,
      ageSeconds: null,
      vehicleCount: 0,
      upstreamVehicleCount: 0,
      vehicles: [],
      tripUpdates: [],
      attribution: "Data from reclaimchennai/India_GTFS via maps.reclaim.city. Not operated or endorsed by APSRTC.",
      checkedAt: new Date().toISOString()
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
    });
  }
}
