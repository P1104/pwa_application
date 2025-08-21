'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Animated glowing marker icon
const glowingMarker = new L.DivIcon({
  className: 'custom-glow-marker',
  html: `
    <div style="
      width:32px;height:32px;display:flex;align-items:center;justify-content:center;
      ">
      <div style="
        width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 50% 50%, #60a5fa 0%, #a78bfa 80%, transparent 100%);
        box-shadow:0 0 16px 8px #a78bfa88, 0 0 32px 16px #60a5fa44;
        border:2px solid #fff;
        animation: pulse-glow 1.5s infinite;
      "></div>
      <style>
        @keyframes pulse-glow {
          0% { box-shadow:0 0 16px 8px #a78bfa88, 0 0 32px 16px #60a5fa44; }
          50% { box-shadow:0 0 32px 16px #a78bfa88, 0 0 48px 24px #60a5fa44; }
          100% { box-shadow:0 0 16px 8px #a78bfa88, 0 0 32px 16px #60a5fa44; }
        }
      </style>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function FlyToLocation({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([latitude, longitude], 16, { duration: 1.2 });
  }, [latitude, longitude]);
  return null;
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

export function LocationMap({ latitude, longitude }: LocationMapProps) {
  if (!latitude || !longitude) return null;

  return (
    <div style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={glowingMarker}>
          <Popup>
            <div style={{ textAlign: "center" }}>
              <strong>You are here!</strong>
              <br />
              <span>Lat: {latitude.toFixed(6)}</span>
              <br />
              <span>Lng: {longitude.toFixed(6)}</span>
            </div>
          </Popup>
        </Marker>
        <FlyToLocation latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}