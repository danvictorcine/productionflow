// @/src/components/location-picker.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { LocationAddress } from '@/lib/types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

interface LocationPickerProps {
  initialPosition: LatLngExpression;
  onLocationChange: (lat: number, lng: number, address: LocationAddress) => void;
}

const LocationPickerInner = ({ initialPosition, onLocationChange }: Omit<LocationPickerProps, 'location'>) => {
  const map = useMap();
  const [position, setPosition] = useState<LatLngExpression | null>(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
    map.flyTo(initialPosition, map.getZoom());
  }, [initialPosition, map]);

  useEffect(() => {
    const mapClickHandler = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        const address: LocationAddress = {
            displayName: data.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`,
            ...data.address
        };
        onLocationChange(lat, lng, address);
      } catch (error) {
        console.error('Reverse geocoding failed', error);
        onLocationChange(lat, lng, { displayName: `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}` });
      }
    };
    map.on('click', mapClickHandler);
    return () => {
      map.off('click', mapClickHandler);
    };
  }, [map, onLocationChange]);

  return position ? <Marker position={position}></Marker> : null;
};

export function LocationPicker({ initialPosition, onLocationChange }: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=1&addressdetails=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name, address } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setCurrentPosition(newPos);
        onLocationChange(newPos[0], newPos[1], { displayName: display_name, ...address });
      } else {
        toast({ variant: 'destructive', title: 'Localização não encontrada.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar localização.' });
    }
  };

  if (!isClient) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-2 h-full flex flex-col">
       <div className="flex gap-2 mb-2">
            <Input
            placeholder="Pesquisar um endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
                }
            }}
            />
            <Button type="button" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" /> Buscar
            </Button>
      </div>
      <MapContainer center={currentPosition} zoom={13} className="h-64 w-full rounded-md border">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationPickerInner initialPosition={currentPosition} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
