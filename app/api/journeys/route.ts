import { NextRequest, NextResponse } from "next/server";
import { unzipSync, strFromU8 } from "fflate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Row = Record<string, string>;
type Feed = {
  stops: Row[]; routes: Map<string, Row>; trips: Row[];
  stopTimesByTrip: Map<string, Row[]>; calendar: Row[]; calendarDates: Row[];
  feedInfo: Row | null;
};
let cachedFeed: Promise<Feed> | null = null;

function parseCsv(input: string): Row[] {
  const lines: string[] = [];
  let line = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { line += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "\n" && !quoted) { lines.push(line.replace(/\r$/, "")); line = ""; }
    else line += ch;
  }
  if (line) lines.push(line.replace(/\r$/, ""));
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map(v => v.trim());
  return lines.slice(1).filter(Boolean).map(raw => {
    const values = splitCsvLine(raw);
    const row: Row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
    return row;
  });
}
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { out.push(value); value = ""; }
    else value += ch;
  }
  out.push(value); return out;
}
async function loadFeed(): Promise<Feed> {
  if (!cachedFeed) cachedFeed = (async () => {
    const response = await fetch("https://maps.reclaim.city/gtfs/apsrtc.zip", {
      cache: "force-cache", next: { revalidate: 3600 }, signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error("APSRTC community timetable feed is unavailable.");
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const read = (name: string) => {
      const file = files[name];
      return file ? parseCsv(strFromU8(file)) : [];
    };
    const stopTimesByTrip = new Map<string, Row[]>();
    for (const row of read("stop_times.txt")) {
      const key = row.trip_id;
      if (!key) continue;
      const list = stopTimesByTrip.get(key) ?? [];
      list.push(row); stopTimesByTrip.set(key, list);
    }
    for (const list of stopTimesByTrip.values()) list.sort((a,b) => Number(a.stop_sequence)-Number(b.stop_sequence));
    return {
      stops: read("stops.txt"),
      routes: new Map(read("routes.txt").map(row => [row.route_id, row])),
      trips: read("trips.txt"), stopTimesByTrip,
      calendar: read("calendar.txt"), calendarDates: read("calendar_dates.txt"),
      feedInfo: read("feed_info.txt")[0] ?? null
    };
  })().catch(error => { cachedFeed = null; throw error; });
  return cachedFeed;
}
function dateKey(date: string) { return date.replaceAll("-", ""); }
function activeService(feed: Feed, date: string): Set<string> {
  const day = new Date(date + "T12:00:00").getDay();
  const dayFields = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const key = dateKey(date); const active = new Set<string>();
  for (const row of feed.calendar) {
    if (key >= row.start_date && key <= row.end_date && row[dayFields[day]] === "1") active.add(row.service_id);
  }
  for (const row of feed.calendarDates) if (row.date === key) {
    if (row.exception_type === "1") active.add(row.service_id);
    if (row.exception_type === "2") active.delete(row.service_id);
  }
  return active;
}
function toMinutes(value: string): number {
  const match = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(value || "");
  return match ? Number(match[1])*60 + Number(match[2]) + Number(match[3])/60 : Number.POSITIVE_INFINITY;
}
function displayTime(value: string): string {
  const minutes = toMinutes(value);
  if (!Number.isFinite(minutes)) return value;
  const hour = Math.floor(minutes/60)%24, minute = Math.floor(minutes%60);
  return new Date(2000,0,1,hour,minute).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const from = (params.get("from") || "").trim().toLocaleLowerCase();
  const to = (params.get("to") || "").trim().toLocaleLowerCase();
  const date = params.get("date") || "";
  if (from.length < 2 || to.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "Enter a starting place, destination and journey date." }, { status: 400 });
  if (from === to) return NextResponse.json({ journeys: [], message: "Choose two different places." });

  try {
    const feed = await loadFeed();
    const active = activeService(feed, date);
    if (!active.size) return NextResponse.json({ journeys: [], message: "The timetable has no active service calendar for this date.", source: "Community APSRTC GTFS feed", feedInfo: feed.feedInfo });
    const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
      const radians = (value: number) => value * Math.PI / 180;
      const dLat = radians(bLat - aLat), dLon = radians(bLon - aLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const findStops = (query: string, latValue: string | null, lonValue: string | null) => {
      const lat = latValue === null ? Number.NaN : Number(latValue);
      const lon = lonValue === null ? Number.NaN : Number(lonValue);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const nearby = feed.stops.map(stop => ({
          stop,
          distance: distanceKm(lat, lon, Number(stop.stop_lat), Number(stop.stop_lon))
        })).filter(item => Number.isFinite(item.distance) && item.distance <= 25)
          .sort((a, b) => a.distance - b.distance).slice(0, 20);
        if (nearby.length) return nearby.map(item => ({ stop: item.stop, name: (item.stop.stop_name || "").toLocaleLowerCase() }));
      }
      return feed.stops
        .map(stop => ({ stop, name: (stop.stop_name || "").toLocaleLowerCase() }))
        .filter(item => item.name.includes(query))
        .slice(0, 30);
    };
    const origins = findStops(from, params.get("fromLat"), params.get("fromLon"));
    const destinations = findStops(to, params.get("toLat"), params.get("toLon"));
    if (!origins.length || !destinations.length) return NextResponse.json({
      journeys: [], message: "No matching stops found in the published timetable. Try a nearby bus-stand or stop name.",
      matchedFrom: origins.length, matchedTo: destinations.length, source: "Community APSRTC GTFS feed"
    });
    const originIds = new Set(origins.map(x => x.stop.stop_id));
    const destinationIds = new Set(destinations.map(x => x.stop.stop_id));
    const tripsById = new Map(feed.trips.map(trip => [trip.trip_id, trip]));
    const journeys: Array<Record<string, unknown> & { departureMinutes: number }> = [];
    for (const [tripId, times] of feed.stopTimesByTrip) {
      const trip = tripsById.get(tripId);
      if (!trip || !active.has(trip.service_id)) continue;
      let startIndex = -1, endIndex = -1;
      for (let i=0; i<times.length; i++) {
        if (startIndex < 0 && originIds.has(times[i].stop_id)) startIndex = i;
        if (startIndex >= 0 && i > startIndex && destinationIds.has(times[i].stop_id)) { endIndex = i; break; }
      }
      if (startIndex < 0 || endIndex < 0) continue;
      const start = times[startIndex], end = times[endIndex];
      const departureMinutes = toMinutes(start.departure_time || start.arrival_time);
      const arrivalMinutes = toMinutes(end.arrival_time || end.departure_time);
      if (!Number.isFinite(departureMinutes) || !Number.isFinite(arrivalMinutes)) continue;
      const route = feed.routes.get(trip.route_id) ?? {};
      journeys.push({
        tripId, routeId: trip.route_id,
        routeName: route.route_short_name || route.route_long_name || trip.route_id,
        routeDescription: route.route_long_name || "",
        fromStop: origins.find(x => x.stop.stop_id === start.stop_id)?.stop.stop_name || start.stop_id,
        toStop: destinations.find(x => x.stop.stop_id === end.stop_id)?.stop.stop_name || end.stop_id,
        departure: displayTime(start.departure_time || start.arrival_time),
        arrival: displayTime(end.arrival_time || end.departure_time),
        departureTime: start.departure_time || start.arrival_time,
        arrivalTime: end.arrival_time || end.departure_time,
        durationMinutes: Math.max(0, Math.round(arrivalMinutes-departureMinutes)),
        departureMinutes,
        intermediateStops: endIndex-startIndex-1,
        headsign: trip.trip_headsign || ""
      });
    }
    journeys.sort((a,b) => a.departureMinutes-b.departureMinutes);
    const unique = new Map<string, typeof journeys[number]>();
    for (const journey of journeys) {
      const key = [journey.routeId, journey.departureTime, journey.fromStop, journey.toStop].join("|");
      if (!unique.has(key)) unique.set(key, journey);
    }
    const results = [...unique.values()].slice(0,25).map(({departureMinutes,...journey}) => { void departureMinutes; return journey; });
    return NextResponse.json({
      journeys: results,
      message: results.length ? "Matching scheduled trips from the community-maintained APSRTC GTFS timetable." : "No direct scheduled trip was found between the matching stops for this date.",
      matchedFrom: origins.length, matchedTo: destinations.length,
      source: "Community-maintained APSRTC GTFS mirror (unofficial)",
      feedInfo: feed.feedInfo,
      disclaimer: "Schedules are indicative, may be incomplete or outdated, and are not live seat availability. Confirm with APSRTC before travelling."
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return NextResponse.json({
      journeys: [], error: error instanceof Error ? error.message : "Timetable search failed.",
      source: "Community-maintained APSRTC GTFS mirror (unofficial)"
    }, { status: 502 });
  }
}
