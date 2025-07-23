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
  isExporting?: boolean;
}

export function DisplayMap({ position, className, isExporting = false }: DisplayMapProps) {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const [lat, lng] = Array.isArray(position) ? position : [position.lat, position.lng];
  const zoom = 14;
  
  // Always render the interactive map. The PDF export logic will handle the capture.
  // This ensures the marker and attribution are always present.
  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom={false}
      className={className}
      dragging={!isExporting} // Disable dragging when exporting
      zoomControl={!isExporting}
      attributionControl={true} // Ensure attribution is always on
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        crossOrigin="anonymous"
      />
      <Marker position={position}></Marker>
    </MapContainer>
  );
}
