'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
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
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); }
        50% { box-shadow: 0 0 20px rgba(59, 130, 246, 1); }
        100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); }
      }
    </style>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function FlyToLocation({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([latitude, longitude], 16, { duration: 1.2 });
  }, [latitude, longitude, map]); // Added 'map' to dependency array
  return null;
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

export function LocationMap({ latitude, longitude }: LocationMapProps) {
  if (!latitude || !longitude) return null;
 
  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={glowingMarker}>
          <Popup>
            <div className="text-center">
              <strong>You are here!</strong>
              <br />
              <small>
                Lat: {latitude.toFixed(6)}
                <br />
                Lng: {longitude.toFixed(6)}
              </small>
            </div>
          </Popup>
        </Marker>
        <FlyToLocation latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}