import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon resolves image URLs relative to the page,
// which breaks under Vite's bundling — a plain divIcon sidesteps that class
// of bug entirely instead of juggling imported PNG asset URLs.
const vanIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px; border-radius: 9999px;
    background: #7C3AED; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  ">🚌</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface LiveMapProps {
  latitude: number;
  longitude: number;
  popupLabel?: string;
  height?: number | string;
}

export function LiveMap({ latitude, longitude, popupLabel, height = 320 }: LiveMapProps) {
  return (
    <div style={{ height, borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={vanIcon}>
          {popupLabel && <Popup>{popupLabel}</Popup>}
        </Marker>
        <Recenter lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  );
}

interface MultiVehicle {
  _id: string;
  latitude: number;
  longitude: number;
  label: string;
}

export function LiveFleetMap({ vehicles, height = 420 }: { vehicles: MultiVehicle[]; height?: number | string }) {
  const center: [number, number] = vehicles.length > 0
    ? [vehicles[0].latitude, vehicles[0].longitude]
    : [20.5937, 78.9629]; // India centroid fallback when nothing is active yet

  return (
    <div style={{ height, borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={vehicles.length > 0 ? 13 : 4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vehicles.map((v) => (
          <Marker key={v._id} position={[v.latitude, v.longitude]} icon={vanIcon}>
            <Popup>{v.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
