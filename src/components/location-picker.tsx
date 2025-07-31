// @/src/components/location-picker.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
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

  const getZoomLevel = (pos: LatLngExpression) => {
    const lat = Array.isArray(pos) ? pos[0] : pos.lat;
    if (Math.abs(lat - -14.235) < 1) return 4;
    return 13;
  };
  
  const handleMapClick = async (latlng: LatLng) => {
    const newPos: [number, number] = [latlng.lat, latlng.lng];
    setPosition(newPos);
    map.flyTo(newPos, map.getZoom());
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`
      );
      const data = await response.json();
      const fallbackName = data.display_name || `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`;
      const displayName = formatAddress(data.address, fallbackName);
      onLocationChange(latlng.lat, latlng.lng, displayName);
    } catch (error) {
      console.error('Reverse geocoding failed', error);
      onLocationChange(latlng.lat, latlng.lng, `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`);
    }
  };

  const MapClickHandler = () => {
    useMap().addEventListener('click', handleMapClick);
    return null;
  };

  const formatAddress = (address: any, fallback: string): string => {
    if (!address) return fallback;
    const { road, house_number, suburb, postcode, state, town, village } = address;

    const formatted = [road || town || village, house_number, suburb, postcode, state].filter(Boolean).join(', ');

    return formatted || fallback;
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=1&addressdetails=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, address, display_name } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        map.flyTo(newPos, 13);
        const displayName = formatAddress(address, display_name);
        onLocationChange(newPos[0], newPos[1], displayName);
      } else {
        toast({ variant: 'destructive', title: 'Localização não encontrada.' });
      }
    } catch (error) {
      console.error('Geocoding search failed', error);
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
        <MapClickHandler />
        <Marker position={position}></Marker>
      </div>
    </div>
  );
};

export function LocationPicker(props: LocationPickerProps) {
  return (
    <MapContainer center={props.initialPosition} zoom={4} className="h-64 w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerInner {...props} />
    </MapContainer>
  );
}
