// @/src/components/location-picker.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng, LatLngExpression } from 'leaflet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerProps {
  initialPosition: LatLngExpression;
  onLocationChange: (lat: number, lng: number, name: string) => void;
}

const LocationPickerInner = ({ initialPosition, onLocationChange }: LocationPickerProps) => {
  const map = useMap();
  const [position, setPosition] = useState<LatLngExpression>(initialPosition);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const formatAddress = (address: any, fallback: string): string => {
    if (!address) return fallback;
    const { road, house_number, suburb, postcode, state, town, village, city } = address;
    const mainStreet = road || town || village || city;
    const parts = [mainStreet, house_number, suburb, postcode, state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  };

  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        const displayName = formatAddress(data.address, data.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
        onLocationChange(lat, lng, displayName);
      } catch (error) {
        console.error('Reverse geocoding failed', error);
        onLocationChange(lat, lng, `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
      }
    },
  });

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=1&addressdetails=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, address, display_name } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        map.flyTo(newPos, 14);
        const displayName = formatAddress(address, display_name);
        onLocationChange(newPos[0], newPos[1], displayName);
      } else {
        toast({ variant: 'destructive', title: 'Localização não encontrada.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar localização.' });
    }
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex gap-2">
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
      <div className="flex-1 h-full w-full rounded-md overflow-hidden border">
         <MapContainer center={position as LatLngExpression} zoom={4} className="h-full w-full" whenCreated={mapInstance => {
            // This logic runs once when the map is created.
            // We use the inner component's map instance for subsequent updates.
         }}>
             <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
             <Marker position={position as LatLngExpression}></Marker>
         </MapContainer>
      </div>
    </div>
  );
};


export function LocationPicker(props: LocationPickerProps) {
  const safeInitialPosition = Array.isArray(props.initialPosition) && typeof props.initialPosition[0] === 'number'
    ? props.initialPosition
    : [-14.235, -51.925];

  // We need a key to force re-mounting the entire component if the initial position changes drastically.
  // This is a robust way to handle Leaflet's non-reactive nature.
  const mapKey = `${safeInitialPosition[0]}-${safeInitialPosition[1]}`;

  return (
    <MapContainer center={safeInitialPosition} zoom={4} className="h-64 w-full" key={mapKey}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerInner {...props} initialPosition={safeInitialPosition} />
    </MapContainer>
  );
}
