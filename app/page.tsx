"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AndhraMap = dynamic(() => import("./components/AndhraMap"), { ssr: false, loading: () => <div className="map-loading">Loading Andhra Pradesh map…</div> });
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, BusFront, CalendarDays,
  Clock3, Compass, Heart, MapPin, Menu, Navigation,
  Search, ShieldCheck, Ticket, WifiOff, X
} from "lucide-react";

type LiveVehicle = {
  id: string; label: string; routeId: string | null; tripId: string | null;
  latitude: number; longitude: number; speedKph: number | null; bearing: number | null; timestamp: string | null;
};
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [searched, setSearched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapChoice, setMapChoice] = useState<"from" | "to">("from");
  const [liveData, setLiveData] = useState<LiveFeed | null>(null);

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

  function chooseMapCity(city: string) {
    if (mapChoice === "from") { setFrom(city); setMapChoice("to"); }
    else { setTo(city); setMapChoice("from"); }
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth" });
  }

  function swapPlaces() {
    setFrom(to);
    setTo(from);
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearched(true);
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
        <div className="search-heading"><div><span className="section-kicker">START YOUR TRIP</span><h2>Where would you like to go?</h2></div><span className="search-note"><ShieldCheck size={15} /> Plan with confidence</span></div>
        <form className="journey-form" onSubmit={submitSearch}>
          <label className="place-field"><span>FROM</span><div><MapPin size={19} /><input value={from} onChange={e => setFrom(e.target.value)} placeholder="Leaving from" required /></div></label>
          <button className="swap-button" type="button" onClick={swapPlaces} aria-label="Swap origin and destination"><ArrowDownUp size={18} /></button>
          <label className="place-field"><span>TO</span><div><Navigation size={18} /><input value={to} onChange={e => setTo(e.target.value)} placeholder="Going to" required /></div></label>
          <label className="date-field"><span>JOURNEY DATE</span><div><CalendarDays size={18} /><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required /></div></label>
          <button className="search-button" type="submit"><Search size={18} /> Find buses <ArrowRight size={16} /></button>
        </form>
        {searched && <div className="search-feedback"><div className="feedback-icon"><Clock3 size={19} /></div><div><strong>Schedule connection coming next</strong><p>We received your search for {from} to {to} on {date}. Verified APSRTC timetable data is not connected yet, so we won&apos;t show unverified services or timings.</p><a href="https://www.apsrtconline.in/" target="_blank" rel="noreferrer">Check official availability <ArrowUpRight size={14} /></a></div></div>}
        <div className="popular-row"><span>POPULAR DESTINATIONS</span>{["Vijayawada", "Visakhapatnam", "Tirupati", "Guntur", "Kurnool"].map(city => <button key={city} onClick={() => { setTo(city); setSearched(false); }}>{city}</button>)}</div>
      </section>

      <section className="quick-section" id="discover">
        <div className="section-heading"><div><span className="section-kicker">YOUR TRAVEL TOOLKIT</span><h2>Everything starts here.</h2></div><p>Useful links and tools for a smoother trip.</p></div>
        <div className="quick-grid">{quickLinks.map((item, i) => { const Icon = item.icon; const href = i === 2 ? "https://www.apsrtconline.in/" : i === 3 ? "https://www.apsrtclivetrack.com/" : i === 1 ? "https://www.google.com/maps/search/bus+stations+Andhra+Pradesh" : "#journey"; return <a className="quick-card" href={href} target={i === 0 ? undefined : "_blank"} rel={i === 0 ? undefined : "noreferrer"} key={item.title}><span className="quick-icon"><Icon size={21} /></span><span className="quick-text"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight className="quick-arrow" size={17} /></a>; })}</div>
      </section>

      <section className="map-section" id="map">
        <div className="section-heading"><div><span className="section-kicker">EXPLORE THE REGION</span><h2>Andhra Pradesh, on the map.</h2></div><p>Choose a city to add it to your journey.</p></div>
        <div className="map-layout">
          <div className="map-frame"><AndhraMap onChoose={chooseMapCity} vehicles={liveData?.vehicles ?? []} /><div className="map-legend"><span><i /> City reference points</span><span><i className="live-map-legend-dot" /> Live buses</span><span className="map-note">Bus pins appear only when the feed is fresh</span></div></div>
          <aside className="map-aside"><span className="section-kicker">PICK A DESTINATION</span><h3>Explore major city hubs</h3><p>Tap a marker on the map or choose a city below. The selection fills your trip planner; it does not imply a confirmed APSRTC service.</p><div className="map-city-list">{["Visakhapatnam","Rajamahendravaram","Kakinada","Vijayawada","Guntur","Amaravati","Ongole","Nellore","Tirupati","Kadapa","Kurnool","Anantapur"].map(city => <button key={city} type="button" onClick={() => chooseMapCity(city)}><MapPin size={14}/>{city}<ArrowUpRight size={13}/></button>)}</div><div className="map-select-hint">Next selection: <strong>{mapChoice === "from" ? "Starting city" : "Destination city"}</strong></div></aside>
        </div>
        <p className="map-attribution">Map tiles © OpenStreetMap contributors. Markers are approximate city-centre reference points, not verified APSRTC stops.</p>
      </section>

      <section className="tracking-section" id="tracking">
        <div className="tracking-copy"><span className="section-kicker">LIVE VEHICLE DATA</span><h2>Know where your<br /><em>bus really is.</em></h2><p>Vehicle positions refresh automatically every 30 seconds from a community-maintained APSRTC GTFS real-time mirror. This is independent data, not an APSRTC-operated API. Always verify critical journeys with APSRTC.</p><a className="primary-link" href="https://www.apsrtclivetrack.com/" target="_blank" rel="noreferrer">Open official Live Track <ArrowUpRight size={16} /></a></div>
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
          <p style={{fontSize:9,lineHeight:1.5,color:"#8b968c",margin:"12px 0 0"}}>Unofficial community source · Not endorsed by APSRTC · {liveData?.attribution ?? "Source attribution pending"}</p>
        </div>
      </section>

      <section className="trust-strip"><div><ShieldCheck size={22} /><span><strong>No fabricated live data</strong><small>Only verified information is labelled live.</small></span></div><div><BusFront size={22} /><span><strong>Passenger-first design</strong><small>Simple tools for everyday journeys.</small></span></div><div><Heart size={22} /><span><strong>Made for Andhra Pradesh</strong><small>Designed with local travellers in mind.</small></span></div></section>

      <footer id="help"><div className="footer-main"><div className="brand footer-brand"><span className="brand-mark"><BusFront size={22} /></span><span><strong>APSRTC<span className="brand-accent">Live</span></strong><small>TRAVEL WITH CONFIDENCE</small></span></div><p>An independent passenger experience concept. Not an official APSRTC product or service.</p><div className="footer-links">{officialLinks.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={13} /></a>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} APSRTC Live. Built for travellers.</span><span>Official services remain the source of truth.</span></div></footer>
    </main>
  );
}
