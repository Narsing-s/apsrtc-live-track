"use client";

import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";

export type CityHub = { name: string; lat: number; lng: number; note: string };

export type NearbyStop = { id: string; name: string; lat: number; lon: number; kind: string };
export type UserPosition = { lat: number; lon: number };
export type LiveVehicle = { id: string; label: string; routeId: string | null; tripId: string | null; latitude: number; longitude: number; speedKph: number | null; bearing: number | null; timestamp: string | null };

export const CITY_HUBS: CityHub[] = [
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185, note: "North-coastal city reference point" },
  { name: "Rajamahendravaram", lat: 17.0005, lng: 81.8040, note: "Godavari region reference point" },
  { name: "Kakinada", lat: 16.9891, lng: 82.2475, note: "Coastal city reference point" },
  { name: "Vijayawada", lat: 16.5062, lng: 80.6480, note: "Krishna region reference point" },
  { name: "Guntur", lat: 16.3067, lng: 80.4365, note: "Guntur city reference point" },
  { name: "Amaravati", lat: 16.5417, lng: 80.5150, note: "Capital region reference point" },
  { name: "Ongole", lat: 15.5057, lng: 80.0499, note: "Prakasam region reference point" },
  { name: "Nellore", lat: 14.4426, lng: 79.9865, note: "Nellore city reference point" },
  { name: "Tirupati", lat: 13.6288, lng: 79.4192, note: "Tirupati city reference point" },
  { name: "Kadapa", lat: 14.4673, lng: 78.8242, note: "Kadapa city reference point" },
  { name: "Kurnool", lat: 15.8281, lng: 78.0373, note: "Rayalaseema city reference point" },
  { name: "Anantapur", lat: 14.6819, lng: 77.6006, note: "Anantapur city reference point" }
];

const busIcon = L.divIcon({
  className: "apsrtc-live-bus-icon",
  html: '<span class="apsrtc-live-bus-marker">🚌</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const userIcon = L.divIcon({ className: "apsrtc-user-location", html: '<span style="display:block;width:18px;height:18px;background:#2878f0;border:4px solid white;border-radius:50%;box-shadow:0 0 0 8px #2878f044"></span>', iconSize:[26,26], iconAnchor:[13,13] });
const stopIcon = L.divIcon({ className: "apsrtc-nearby-stop", html: '<span style="display:block;width:12px;height:12px;background:#f0a33a;border:2px solid white;border-radius:50%;box-shadow:0 1px 5px #0005"></span>', iconSize:[16,16], iconAnchor:[8,8] });

function FollowUser({ location }: { location: UserPosition | null }) {
  const map = useMap();
  if (location) map.setView([location.lat, location.lon], 13, { animate: true });
  return null;
}

const hubIcon = L.divIcon({
  className: "apsrtc-map-marker",
  html: '<span class="apsrtc-map-marker-core"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

export default function AndhraMap({ onChoose, vehicles = [], userLocation = null, nearbyStops = [] }: { onChoose: (city: string) => void; vehicles?: LiveVehicle[]; userLocation?: UserPosition | null; nearbyStops?: NearbyStop[] }) {
  return (
    <MapContainer center={[16.2, 80.2]} zoom={6.3} minZoom={5} maxZoom={12} scrollWheelZoom={false} zoomControl={false} className="andhra-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />\n      <FollowUser location={userLocation} />\n      {userLocation && <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}><Popup><strong>Your current location</strong></Popup></Marker>}\n      {nearbyStops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={stopIcon}><Popup><strong>{stop.name}</strong><span>{stop.kind} · OpenStreetMap mapped location</span></Popup></Marker>)}
      {vehicles.map((vehicle) => (
        <Marker key={vehicle.id} position={[vehicle.latitude, vehicle.longitude]} icon={busIcon}>
          <Popup>
            <div className="map-popup">
              <strong>{vehicle.label}</strong>
              <span>Route: {vehicle.routeId ?? "Not matched"}</span>
              {vehicle.speedKph !== null && <span>Speed: {vehicle.speedKph} km/h</span>}
              {vehicle.timestamp && <span>GPS update: {new Date(vehicle.timestamp).toLocaleTimeString("en-IN")}</span>}
              <span>Live position from an unofficial community feed</span>
            </div>
          </Popup>
        </Marker>
      ))}
      {CITY_HUBS.map((hub) => (
        <Marker key={hub.name} position={[hub.lat, hub.lng]} icon={hubIcon}>
          <Popup>
            <div className="map-popup">
              <strong>{hub.name}</strong>
              <span>{hub.note}</span>
              <button type="button" onClick={() => onChoose(hub.name)}>Use in journey search</button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
