// @/src/components/display-map.tsx
'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; 
import 'leaflet-defaulticon-compatibility';
import Image from 'next/image';

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

  if (isExporting) {
    const lonToX = (lon: number, z: number) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const latToY = (lat: number, z: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    const x = lonToX(lng, zoom);
    const y = latToY(lat, zoom);
    const staticMapUrl = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

    return (
       <div 
        className={className} 
        style={{ 
          backgroundImage: `url(${staticMapUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: '100%',
          width: '100%'
        }}
       >
         {/* Children can be added here if needed, like a marker overlay */}
       </div>
    );
  }
  
  return (
    <MapContainer
      center={position}
      zoom={zoom}
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
