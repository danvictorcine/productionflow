// @/src/components/display-map.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; 
import 'leaflet-defaulticon-compatibility';
import { Skeleton } from './ui/skeleton';

interface DisplayMapProps {
  position: LatLngExpression;
  className?: string;
  isExporting?: boolean;
}

export function DisplayMap({ position, className, isExporting = false }: DisplayMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <Skeleton className={className} />;
  }

  const [lat, lng] = Array.isArray(position) ? position : [position.lat, position.lng];
  const zoom = 14;
  
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
