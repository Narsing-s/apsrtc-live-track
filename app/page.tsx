"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AndhraMap = dynamic(() => import("./components/AndhraMap"), { ssr: false, loading: () => <div className="map-loading">Loading Andhra Pradesh map…</div> });
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, BusFront, CalendarDays,
  Clock3, Compass, Heart, MapPin, Menu, Navigation,
  Search, ShieldCheck, Ticket, X
} from "lucide-react";

type LiveVehicle = {
  id: string; label: string; routeId: string | null; tripId: string | null;
  latitude: number; longitude: number; speedKph: number | null; bearing: number | null; timestamp: string | null;
};
type PlaceResult = { id: string; name: string; displayName: string; lat: number; lon: number; type: string };
type UserPosition = { lat: number; lon: number };
type PlaceCoordinates = { lat: number; lon: number } | null;
type NearbyStop = { id: string; name: string; lat: number; lon: number; kind: string };
type Journey = { tripId: string; routeId: string; routeName: string; routeDescription: string; fromStop: string; toStop: string; departure: string; arrival: string; durationMinutes: number; intermediateStops: number; headsign: string };
type LiveFeed = {
  liveTracking: "live" | "stale" | "unavailable";
  message: string; updatedAt: string | null; ageSeconds: number | null;
  vehicleCount: number; upstreamVehicleCount: number; vehicles: LiveVehicle[];
  tripUpdates: unknown[]; sourceLabel: string; attribution: string;
};

const quickLinks = [
  { icon: BusFront, title: "Find a bus", detail: "Explore available services" },
  { icon: MapPin, title: "Bus stops", detail: "Discover nearby stations" },
  { icon: Ticket, title: "Book tickets", detail: "Official APSRTC booking" },
  { icon: Compass, title: "Track journey", detail: "Open official live tracker" }
];

const officialLinks = [
  { label: "APSRTC website", href: "https://apsrtc.ap.gov.in/" },
  { label: "Live bus tracking", href: "https://www.apsrtclivetrack.com/" },
  { label: "Online reservations", href: "https://www.apsrtconline.in/" }
];

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromCoordinates, setFromCoordinates] = useState<PlaceCoordinates>(null);
  const [toCoordinates, setToCoordinates] = useState<PlaceCoordinates>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [searched, setSearched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapChoice, setMapChoice] = useState<"from" | "to">("from");
  const [liveData, setLiveData] = useState<LiveFeed | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [userLocation, setUserLocation] = useState<UserPosition | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [locationMessage, setLocationMessage] = useState("Location permission has not been requested.");
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);

  useEffect(() => {
    let active = true;
    const refreshLiveData = async () => {
      try {
        const response = await fetch("/api/live-status", { cache: "no-store" });
        const data = await response.json() as LiveFeed;
        if (active) setLiveData(data);
      } catch {
        if (active) setLiveData({
          liveTracking: "unavailable", message: "Could not reach the live data service.",
          updatedAt: null, ageSeconds: null, vehicleCount: 0, upstreamVehicleCount: 0,
          vehicles: [], tripUpdates: [], sourceLabel: "Community mirror status unavailable",
          attribution: "Live feed could not be checked."
        });
      }
    };
    refreshLiveData();
    const timer = window.setInterval(refreshLiveData, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);


  useEffect(() => {
    const query = activeField === "from" ? from : activeField === "to" ? to : "";
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        setSuggestions(Array.isArray(data.results) ? data.results : []);
      } catch { if (!controller.signal.aborted) setSuggestions([]); }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [from, to, activeField]);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationMessage("Location is not supported by this browser."); return; }
    navigator.geolocation.getCurrentPosition(async position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserLocation(point);
      try {
        const [addressResponse, stopResponse] = await Promise.all([
          fetch(`/api/places?lat=${point.lat}&lon=${point.lon}`),
          fetch(`/api/nearby-stops?lat=${point.lat}&lon=${point.lon}`)
        ]);
        const address = await addressResponse.json(); const stops = await stopResponse.json();
        const label = address.name || address.displayName?.split(",")[0] || "My location";
        setLocationLabel(label); setFrom(current => current || label); setFromCoordinates(current => current || point);
        setNearbyStops(Array.isArray(stops.stops) ? stops.stops : []);
        setLocationMessage("Your location is detected.");
      } catch { setLocationMessage("Location detected; nearby places could not be loaded."); }
    }, error => setLocationMessage(error.code === 1 ? "Location permission denied. You can still search manually." : "Could not detect location. Use the location button to retry."), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) { setLocationMessage("Location is not supported by this browser."); return; }
    setLocationMessage("Detecting your location…");
    navigator.geolocation.getCurrentPosition(async position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserLocation(point);
      try {
        const [addressResponse, stopResponse] = await Promise.all([
          fetch(`/api/places?lat=${point.lat}&lon=${point.lon}`),
          fetch(`/api/nearby-stops?lat=${point.lat}&lon=${point.lon}`)
        ]);
        const address = await addressResponse.json(); const stops = await stopResponse.json();
        const label = address.name || address.displayName?.split(",")[0] || "My location";
        setLocationLabel(label); setFrom(label); setFromCoordinates(point);
        setNearbyStops(Array.isArray(stops.stops) ? stops.stops : []);
        setLocationMessage("Your location and nearby stops are loaded.");
      } catch { setLocationMessage("Location detected, but nearby places are unavailable."); }
    }, () => setLocationMessage("Location permission unavailable. Check browser settings."), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  function chooseSuggestion(place: PlaceResult) {
    if (activeField === "from") { setFrom(place.name); setFromCoordinates({ lat: place.lat, lon: place.lon }); }
    if (activeField === "to") { setTo(place.name); setToCoordinates({ lat: place.lat, lon: place.lon }); }
    setSuggestions([]); setActiveField(null);
  }

  const nearbyLiveBuses = userLocation ? (liveData?.vehicles ?? []).map(bus => {
    const rad = (value: number) => value * Math.PI / 180;
    const dLat = rad(bus.latitude-userLocation.lat), dLon = rad(bus.longitude-userLocation.lon);
    const a = Math.sin(dLat/2)**2 + Math.cos(rad(userLocation.lat))*Math.cos(rad(bus.latitude))*Math.sin(dLon/2)**2;
    return { ...bus, distanceKm: 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)) };
  }).filter(bus => bus.distanceKm <= 5).sort((a,b) => a.distanceKm-b.distanceKm) : [];

  function chooseMapCity(city: string) {
    if (mapChoice === "from") { setFrom(city); setFromCoordinates(null); setMapChoice("to"); }
    else { setTo(city); setToCoordinates(null); setMapChoice("from"); }
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth" });
  }

  function swapPlaces() {
    setFrom(to);
    setTo(from);
    setFromCoordinates(toCoordinates);
    setToCoordinates(fromCoordinates);
  }

  async function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSearched(true); setJourneyLoading(true); setJourneyMessage(""); setJourneys([]);
    try {
      const params = new URLSearchParams({ from, to, date });
      if (fromCoordinates) { params.set("fromLat", String(fromCoordinates.lat)); params.set("fromLon", String(fromCoordinates.lon)); }
      if (toCoordinates) { params.set("toLat", String(toCoordinates.lat)); params.set("toLon", String(toCoordinates.lon)); }
      const response = await fetch(`/api/journeys?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Journey search failed.");
      setJourneys(Array.isArray(data.journeys) ? data.journeys : []);
      setJourneyMessage(data.message || "Search complete.");
    } catch (error) { setJourneyMessage(error instanceof Error ? error.message : "Journey search failed."); }
    finally { setJourneyLoading(false); }
  }

  return (
    <main>
      <div className="topline"><span className="topline-dot" /> Your journey across Andhra Pradesh, made simpler <a href="https://apsrtc.ap.gov.in/" target="_blank" rel="noreferrer">Official APSRTC <ArrowUpRight size={13} /></a></div>
      <header className="nav-wrap">
        <a className="brand" href="#" aria-label="APSRTC Live home">
          <span className="brand-mark"><BusFront size={22} strokeWidth={2.3} /></span>
          <span><strong>APSRTC<span className="brand-accent">Live</span></strong><small>TRAVEL WITH CONFIDENCE</small></span>
        </a>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <a className="nav-active" href="#journey" onClick={() => setMenuOpen(false)}>Plan journey</a>
          <a href="#tracking" onClick={() => setMenuOpen(false)}>Live tracking</a>
          <a href="#map" onClick={() => setMenuOpen(false)}>Explore map</a>
          <a href="#help" onClick={() => setMenuOpen(false)}>Help</a>
        </nav>
        <a className="nav-cta" href="https://www.apsrtconline.in/" target="_blank" rel="noreferrer">Book tickets <ArrowUpRight size={15} /></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <section className="hero" id="journey">
        <div className="hero-copy">
          <div className="eyebrow"><span /> ANDHRA PRADESH • ONE JOURNEY AT A TIME</div>
          <h1>Every journey<br />has a <em>better way.</em></h1>
          <p className="hero-lead">Your companion for bus travel across Andhra Pradesh. Find your route, explore services and stay connected to official bus updates.</p>
          <div className="hero-proof"><span><ShieldCheck size={16} /> Official-source first</span><i /> <span><Navigation size={15} /> Built for every traveller</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of a bus travelling through Andhra Pradesh landscape">
          <div className="sun-halo" /><div className="hill hill-back" /><div className="hill hill-front" />
          <div className="road"><span /></div>
          <div className="route-pin pin-one"><MapPin size={16} /></div><div className="route-pin pin-two"><MapPin size={16} /></div>
          <div className="bus-illustration"><div className="bus-sign">APSRTC</div><div className="bus-windows"><i /><i /><i /><i /></div><div className="bus-lower"><span>ANDHRA PRADESH</span><b>● ● ●</b></div><div className="wheel wheel-a" /><div className="wheel wheel-b" /></div>
          <div className="art-caption"><span className="caption-line" /> Roads that bring us together</div>
        </div>
      </section>

      <section className="search-section">
        <div className="search-heading"><div><span className="section-kicker">START YOUR TRIP</span><h2>Where would you like to go?</h2></div><button type="button" onClick={requestLocation} className="search-note" style={{border:0,background:"transparent",cursor:"pointer"}}><Navigation size={15} /> Use my location</button></div>
        <p style={{fontSize:12,color:"#718071",margin:"-12px 0 16px"}}>{locationMessage}{locationLabel ? ` · ${locationLabel}` : ""}</p>
        <form className="journey-form" onSubmit={submitSearch}>
          <label className="place-field" style={{position:"relative"}}><span>FROM</span><div><MapPin size={19} /><input value={from} onFocus={() => setActiveField("from")} onChange={e => { setFrom(e.target.value); setFromCoordinates(null); setActiveField("from"); }} placeholder="Leaving from" required autoComplete="off" /></div>{activeField === "from" && suggestions.length > 0 && <div className="place-suggestions" style={{position:"absolute",zIndex:1000,top:"calc(100% + 5px)",left:0,right:0,display:"block",marginTop:0,gap:0,background:"#fff",border:"1px solid #e4e9e1",borderRadius:10,boxShadow:"0 12px 30px #18301b18",maxHeight:260,overflowY:"auto"}}>{suggestions.map(place => <button key={place.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => chooseSuggestion(place)} style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"#fff",border:0,borderBottom:"1px solid #eef1ee",cursor:"pointer"}}><strong>{place.name}</strong><small style={{display:"block",color:"#718071",fontSize:10}}>{place.displayName}</small></button>)}</div>}</label>
          <button className="swap-button" type="button" onClick={swapPlaces} aria-label="Swap origin and destination"><ArrowDownUp size={18} /></button>
          <label className="place-field" style={{position:"relative"}}><span>TO</span><div><Navigation size={18} /><input value={to} onFocus={() => setActiveField("to")} onChange={e => { setTo(e.target.value); setToCoordinates(null); setActiveField("to"); }} placeholder="Going to" required autoComplete="off" /></div>{activeField === "to" && suggestions.length > 0 && <div className="place-suggestions" style={{position:"absolute",zIndex:1000,top:"100%",left:0,right:0,background:"#fff",border:"1px solid #e4e9e1",borderRadius:10,boxShadow:"0 12px 30px #18301b18",maxHeight:230,overflowY:"auto"}}>{suggestions.map(place => <button key={place.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => chooseSuggestion(place)} style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"#fff",border:0,borderBottom:"1px solid #eef1ee",cursor:"pointer"}}><strong>{place.name}</strong><small style={{display:"block",color:"#718071",fontSize:10}}>{place.displayName}</small></button>)}</div>}</label>
          <label className="date-field"><span>JOURNEY DATE</span><div><CalendarDays size={18} /><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required /></div></label>
          <button className="search-button" type="submit"><Search size={18} /> Find buses <ArrowRight size={16} /></button>
        </form>
        {searched && <div className="search-feedback" style={{display:"block",marginTop:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div className="feedback-icon"><Clock3 size={19}/></div><div><strong>{journeyLoading ? "Searching published timetable…" : journeys.length ? `${journeys.length} scheduled direct services found` : "Journey search results"}</strong><p>{journeyMessage}</p></div></div>
          {journeys.length > 0 && <div style={{display:"grid",gap:10,marginTop:14}}>{journeys.map((journey,index)=><article key={journey.tripId+"-"+index} style={{background:"#fff",border:"1px solid #e4ebe4",borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{journey.routeName}</strong><span style={{fontSize:12,color:"#637363"}}>{journey.durationMinutes ? `${Math.floor(journey.durationMinutes/60)}h ${journey.durationMinutes%60}m` : "Duration unavailable"}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:10}}><div><strong>{journey.departure}</strong><small style={{display:"block"}}>{journey.fromStop}</small></div><div style={{textAlign:"right"}}><strong>{journey.arrival}</strong><small style={{display:"block"}}>{journey.toStop}</small></div></div>
            <small style={{display:"block",marginTop:8,color:"#68786a"}}>{journey.intermediateStops} intermediate stops · Scheduled trip · {journey.tripId}</small>
            {(() => { const exact = (liveData?.vehicles ?? []).find(bus => bus.tripId === journey.tripId); const routeMatches = (liveData?.vehicles ?? []).filter(bus => bus.routeId === journey.routeId); const matched = exact ?? (routeMatches.length === 1 ? routeMatches[0] : null); return matched ? <button type="button" onClick={() => { setSelectedVehicle(matched); document.getElementById("tracking")?.scrollIntoView({behavior:"smooth"}); }} style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:10,padding:"9px 12px",border:0,borderRadius:8,background:"#eaf6ee",color:"#216b42",fontWeight:700,cursor:"pointer"}}><Navigation size={15}/> Track this bus · GPS available</button> : <small style={{display:"block",marginTop:9,color:"#8a7045"}}>No fresh GPS vehicle matched to this scheduled service right now.</small>; })()}
            <a href="https://www.apsrtconline.in/" target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:9}}>Check booking on APSRTC <ArrowUpRight size={13}/></a>
          </article>)}</div>}
          <p style={{fontSize:11,marginTop:12,color:"#718071"}}>Unofficial community GTFS timetable. This is not live seat availability or an APSRTC booking confirmation. Verify with APSRTC before travel.</p>
        </div>}
        <div className="popular-row"><span>POPULAR DESTINATIONS</span>{["Vijayawada", "Visakhapatnam", "Tirupati", "Guntur", "Kurnool"].map(city => <button key={city} onClick={() => { setTo(city); setSearched(false); }}>{city}</button>)}</div>
      </section>

      <section className="quick-section" id="discover">
        <div className="section-heading"><div><span className="section-kicker">YOUR TRAVEL TOOLKIT</span><h2>Everything starts here.</h2></div><p>Useful links and tools for a smoother trip.</p></div>
        <div className="quick-grid">{quickLinks.map((item, i) => { const Icon = item.icon; const href = i === 2 ? "https://www.apsrtconline.in/" : i === 3 ? "https://www.apsrtclivetrack.com/" : i === 1 ? "https://www.google.com/maps/search/bus+stations+Andhra+Pradesh" : "#journey"; return <a className="quick-card" href={href} target={i === 0 ? undefined : "_blank"} rel={i === 0 ? undefined : "noreferrer"} key={item.title}><span className="quick-icon"><Icon size={21} /></span><span className="quick-text"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight className="quick-arrow" size={17} /></a>; })}</div>
      </section>

      <section className="map-section" id="map">
        <div className="section-heading"><div><span className="section-kicker">EXPLORE THE REGION</span><h2>Andhra Pradesh, on the map.</h2></div><p>Choose a city to add it to your journey.</p></div>
        <div className="map-layout">
          <div className="map-frame"><AndhraMap onChoose={chooseMapCity} onSelectVehicle={(vehicle) => { setSelectedVehicle(vehicle); document.getElementById("tracking")?.scrollIntoView({behavior:"smooth"}); }} vehicles={liveData?.vehicles ?? []} userLocation={userLocation} nearbyStops={nearbyStops} selectedVehicle={selectedVehicle ? (liveData?.vehicles.find(vehicle => vehicle.id === selectedVehicle.id) ?? selectedVehicle) : null} /><div className="map-legend"><span><i /> City reference points</span><span><i className="live-map-legend-dot" /> Live buses</span><span className="map-note">Bus pins appear only when the feed is fresh</span></div></div>
          <aside className="map-aside"><span className="section-kicker">PICK A DESTINATION</span><h3>Explore major city hubs</h3><p>Tap a marker on the map or choose a city below. The selection fills your trip planner; it does not imply a confirmed APSRTC service.</p><div className="map-city-list">{["Visakhapatnam","Rajamahendravaram","Kakinada","Vijayawada","Guntur","Amaravati","Ongole","Nellore","Tirupati","Kadapa","Kurnool","Anantapur"].map(city => <button key={city} type="button" onClick={() => chooseMapCity(city)}><MapPin size={14}/>{city}<ArrowUpRight size={13}/></button>)}</div><div className="map-select-hint">Next selection: <strong>{mapChoice === "from" ? "Starting city" : "Destination city"}</strong></div></aside>
        </div>
        <p className="map-attribution">Map tiles © OpenStreetMap contributors. Markers are approximate city-centre reference points, not verified APSRTC stops.</p>
      </section>

      <section className="quick-section" id="nearby">
        <div className="section-heading"><div><span className="section-kicker">AROUND YOU</span><h2>Nearby bus stops.</h2></div><p>Based on your device location and OpenStreetMap data.</p></div>
        {userLocation ? <><p style={{fontSize:13,marginBottom:12}}><strong>{nearbyLiveBuses.length}</strong> live buses detected within 5 km {liveData?.liveTracking === "live" ? "(from the current feed)" : "(live feed is not currently fresh)"}</p>{nearbyLiveBuses.length > 0 && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,marginBottom:14}}>{nearbyLiveBuses.map(bus => <div key={bus.id} style={{background:"#f3f8f3",border:"1px solid #e2ebe2",padding:12,borderRadius:12}}><strong><BusFront size={14}/> {bus.label}</strong><small style={{display:"block",color:"#718071",marginTop:4}}>{bus.distanceKm.toFixed(1)} km away · {bus.routeId ? `Route ${bus.routeId}` : "Route not matched"}</small></div>)}</div>}<div className="map-city-list" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>{nearbyStops.length ? nearbyStops.map(stop => <div key={stop.id} style={{background:"#fff",border:"1px solid #e7ece7",padding:14,borderRadius:12}}><strong>{stop.name}</strong><small style={{display:"block",color:"#718071",marginTop:4}}>{stop.kind}</small><button type="button" onClick={() => { setFrom(stop.name); setFromCoordinates({lat:stop.lat,lon:stop.lon}); setTo(""); setToCoordinates(null); setSearched(false); document.getElementById("journey")?.scrollIntoView({behavior:"smooth"}); }} style={{display:"block",marginTop:8,padding:"7px 10px",border:0,borderRadius:7,background:"#eaf6ee",color:"#216b42",fontWeight:700,cursor:"pointer"}}>Use this stop for bus search</button><a style={{fontSize:12,display:"inline-block",marginTop:7}} href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}`} target="_blank" rel="noreferrer">Directions <ArrowUpRight size={12}/></a></div>) : <p>No mapped bus stops found nearby, or the map service is temporarily unavailable.</p>}</div></> : <p>Allow location access to discover mapped stops around you.</p>}
        <p style={{fontSize:11,color:"#7b887c",marginTop:12}}>Nearby stops are OpenStreetMap community data; they are not proof of an active APSRTC service.</p>
      </section>

      <section className="tracking-section" id="tracking">
        <div className="tracking-copy"><span className="section-kicker">LIVE VEHICLE DATA</span><h2>Know where your<br /><em>bus really is.</em></h2><p>Vehicle positions refresh automatically every 30 seconds from a community-maintained APSRTC GTFS real-time mirror. This is independent data, not an APSRTC-operated API. Always verify critical journeys with APSRTC.</p><a className="primary-link" href="https://www.apsrtclivetrack.com/" target="_blank" rel="noreferrer">Open official Live Track <ArrowUpRight size={16} /></a><a className="primary-link" style={{marginLeft:12}} href={userLocation ? `https://www.google.com/maps/@?api=1&map_action=map&center=${userLocation.lat},${userLocation.lon}&layer=traffic` : "https://www.google.com/maps"} target="_blank" rel="noreferrer">View traffic map <ArrowUpRight size={16}/></a></div>
        <div className="tracking-card">
          <div className="tracking-card-top"><div className="live-label"><span className="status-dot" style={{background: liveData?.liveTracking === "live" ? "#249b60" : "#d2a14b"}} /> APSRTC REAL-TIME FEED</div><span className="lock-icon"><ShieldCheck size={17} /></span></div>
          <div className="tracking-empty">
            <div className="signal-icon"><BusFront size={27} /></div>
            <strong>{liveData?.liveTracking === "live" ? `${liveData.vehicleCount.toLocaleString("en-IN")} buses reporting` : liveData?.liveTracking === "stale" ? "Live feed is delayed" : "Checking live vehicle feed…"}</strong>
            <p>{liveData?.message ?? "Connecting to the public real-time feed. Please wait…"}</p>
            <span className="status-pill" style={{background: liveData?.liveTracking === "live" ? "#eaf6ee" : "#f7f4ea", color: liveData?.liveTracking === "live" ? "#287449" : "#94763e"}}><i style={{background: liveData?.liveTracking === "live" ? "#249b60" : "#c79d4e"}} /> {(liveData?.liveTracking ?? "checking").toUpperCase()}</span>
            {liveData?.liveTracking === "live" && <p style={{marginTop:12}}>{liveData.tripUpdates.length.toLocaleString("en-IN")} trip updates available · refreshed every 30 seconds</p>}
          </div>
          <div className="tracking-card-foot"><span>Source</span><strong>{liveData?.sourceLabel ?? "Checking community mirror"}</strong></div>
          <div className="tracking-card-foot" style={{marginTop:10}}><span>Last source update</span><strong>{liveData?.updatedAt ? new Date(liveData.updatedAt).toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "Not available"}</strong></div>
          {selectedVehicle && (() => { const bus = liveData?.vehicles.find(vehicle => vehicle.id === selectedVehicle.id) ?? selectedVehicle; return <div style={{marginTop:16,padding:14,borderRadius:12,border:"1px solid #dce9df",background:"#f7fbf7"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><strong>Live bus selected · {bus.label}</strong><button type="button" onClick={() => setSelectedVehicle(null)} style={{border:0,background:"transparent",cursor:"pointer"}}>Close</button></div><p style={{fontSize:12,margin:"8px 0"}}>Route: {bus.routeId ?? "Not provided"} · Speed: {bus.speedKph === null ? "Unavailable" : `${bus.speedKph} km/h`}</p><p style={{fontSize:12,margin:"8px 0"}}>Current GPS position: {bus.latitude.toFixed(5)}, {bus.longitude.toFixed(5)}</p><p style={{fontSize:11,color:"#718071",margin:"8px 0"}}>Last GPS report: {bus.timestamp ? new Date(bus.timestamp).toLocaleString("en-IN") : "Time unavailable"}. The marker on the app map represents this reported position.</p></div>; })()}
          {selectedVehicle && <div style={{marginTop:16,padding:14,borderRadius:12,border:"1px solid #dce9df",background:"#f7fbf7"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>Selected bus · {selectedVehicle.label}</strong><button type="button" onClick={() => setSelectedVehicle(null)} style={{border:0,background:"transparent",cursor:"pointer",color:"#637363"}} aria-label="Close selected bus">✕</button></div><p style={{fontSize:12,margin:"8px 0",color:"#526454"}}>Route {selectedVehicle.routeId ?? "not provided"} · {selectedVehicle.speedKph === null ? "Speed unavailable" : `${selectedVehicle.speedKph} km/h`}</p><p style={{fontSize:12,margin:"6px 0",color:"#526454"}}>Latest reported position: {selectedVehicle.latitude.toFixed(5)}, {selectedVehicle.longitude.toFixed(5)}</p><p style={{fontSize:11,margin:"6px 0",color:"#7b887c"}}>GPS time: {selectedVehicle.timestamp ? new Date(selectedVehicle.timestamp).toLocaleString("en-IN") : "Not provided"}. The map below shows reported coordinates; this is not a guaranteed continuous GPS connection.</p></div>}
          <p style={{fontSize:9,lineHeight:1.5,color:"#8b968c",margin:"12px 0 0"}}>Unofficial community source · Not endorsed by APSRTC · {liveData?.attribution ?? "Source attribution pending"}</p>
        </div>
      </section>

      <section className="trust-strip"><div><ShieldCheck size={22} /><span><strong>No fabricated live data</strong><small>Only verified information is labelled live.</small></span></div><div><BusFront size={22} /><span><strong>Passenger-first design</strong><small>Simple tools for everyday journeys.</small></span></div><div><Heart size={22} /><span><strong>Made for Andhra Pradesh</strong><small>Designed with local travellers in mind.</small></span></div></section>

      <footer id="help"><div className="footer-main"><div className="brand footer-brand"><span className="brand-mark"><BusFront size={22} /></span><span><strong>APSRTC<span className="brand-accent">Live</span></strong><small>TRAVEL WITH CONFIDENCE</small></span></div><p>An independent passenger experience concept. Not an official APSRTC product or service.</p><div className="footer-links">{officialLinks.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={13} /></a>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} APSRTC Live. Built for travellers.</span><span>Official services remain the source of truth.</span></div></footer>
    </main>
  );
}
