// @/src/components/display-map.tsx
'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; 
import 'leaflet-defaulticon-compatibility';


interface DisplayMapProps {
  position: LatLngExpression;
  className?: string;
}

export function DisplayMap({ position, className }: DisplayMapProps) {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return (
    <MapContainer
      center={position}
      zoom={14}
      scrollWheelZoom={false}
      className={className}
      dragging={false}
      zoomControl={false}
      touchZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}></Marker>
    </MapContainer>
  );
}
