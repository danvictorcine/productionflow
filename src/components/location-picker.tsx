// @/src/components/location-picker.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
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

const MapClickHandler = ({ onMapClick }: { onMapClick: (latlng: { lat: number, lng: number }) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const ChangeView = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
  const map = useMap();
   useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export function LocationPicker({ initialPosition, onLocationChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition as [number, number]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const formatAddress = (address: any, fallback: string): string => {
    if (!address) return fallback;
    // Parts requested: nome da rua, numero, bairro, cep e estado
    const { road, house_number, suburb, postcode, state, town, village } = address;

    const formatted = [
        road || town || village, // Fallback to town/village if road is not present
        house_number,
        suburb,
        postcode,
        state,
    ].filter(Boolean).join(', ');

    return formatted || fallback;
  }

  const handleMapClick = async (latlng: { lat: number, lng: number }) => {
    setPosition([latlng.lat, latlng.lng]);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`);
      const data = await response.json();
      const fallbackName = data.display_name || `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`;
      const displayName = formatAddress(data.address, fallbackName);
      onLocationChange(latlng.lat, latlng.lng, displayName);
    } catch (error) {
      console.error("Reverse geocoding failed", error);
      onLocationChange(latlng.lat, latlng.lng, `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`);
    }
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
        const displayName = formatAddress(address, display_name);
        onLocationChange(newPos[0], newPos[1], displayName);
      } else {
        toast({ variant: 'destructive', title: 'Localização não encontrada.'});
      }
    } catch (error) {
        console.error("Geocoding search failed", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar localização.'});
    }
  };
  
  useEffect(() => {
    setPosition(initialPosition as [number, number]);
  }, [initialPosition]);

  return (
    <div className='space-y-2'>
        <div className="flex gap-2">
            <Input
                placeholder="Pesquisar um endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            />
            <Button type="button" onClick={handleSearch}><Search className="mr-2 h-4 w-4" /> Buscar</Button>
        </div>
        <div className="h-64 w-full rounded-md overflow-hidden border">
            <MapContainer center={position} zoom={13} className="h-full w-full">
                <ChangeView center={position} zoom={position[0] === -14.235 ? 4 : 13} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}></Marker>
                <MapClickHandler onMapClick={handleMapClick} />
            </MapContainer>
        </div>
    </div>
  );
}
