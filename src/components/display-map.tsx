// @/src/components/display-map.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; 
import 'leaflet-defaulticon-compatibility';
import { Share2 } from 'lucide-react';

import { Skeleton } from './ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface DisplayMapProps {
  position: LatLngExpression;
  className?: string;
  isExporting?: boolean;
}

const isValidPosition = (pos: any): pos is LatLngExpression => {
    if (Array.isArray(pos)) {
        return pos.length === 2 && typeof pos[0] === 'number' && typeof pos[1] === 'number';
    }
    if (typeof pos === 'object' && pos !== null) {
        return typeof pos.lat === 'number' && typeof pos.lng === 'number';
    }
    return false;
}

export function DisplayMap({ position, className, isExporting = false }: DisplayMapProps) {
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isValidPosition(position)) {
    return <Skeleton className={className} />;
  }

  const zoom = 14;
  const lat = Array.isArray(position) ? position[0] : position.lat;
  const lng = Array.isArray(position) ? position[1] : position.lng;

  const shareLink = isMobile
    ? `geo:${lat},${lng}`
    : `https://www.google.com/maps?q=${lat},${lng}`;

  
  return (
    <div className={`relative ${className}`}>
        <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
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
        {!isExporting && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild size="icon" className="absolute top-2 right-2 z-[401] h-8 w-8">
                            <a href={shareLink} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar localização">
                                <Share2 className="h-4 w-4" />
                            </a>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Abrir no App de Mapas</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
    </div>
  );
}
