'use client';

import { useState, useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { MAP_CONFIG } from '@/types';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

// Custom pin marker icon
function createPinIcon() {
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="30" height="38">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
      <circle cx="12" cy="11" r="5" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-location-picker-pin',
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -32],
  });
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1 });
  }, [center, map]);
  return null;
}

export default function LocationPickerMapInner({
  latitude = MAP_CONFIG.DEFAULT_CENTER.lat,
  longitude = MAP_CONFIG.DEFAULT_CENTER.lng,
  onLocationChange,
  height = '320px',
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>([latitude, longitude]);
  const pinIcon = createPinIcon();

  useEffect(() => {
    if (latitude && longitude && (latitude !== position[0] || longitude !== position[1])) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationChange({ lat, lng });
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          onLocationChange({ lat, lng });
        },
        (err) => {
          console.warn('Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border/80 shadow-inner group">
      <MapContainer
        center={position}
        zoom={14}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        className="z-10"
      >
        <TileLayer
          attribution={MAP_CONFIG.OSM_ATTRIBUTION}
          url={MAP_CONFIG.OSM_TILE_URL}
        />
        <MapClickHandler onSelect={handleMapClick} />
        <MapRecenter center={position} />
        <Marker position={position} icon={pinIcon}>
          <Popup className="text-xs font-sans">
            <div className="p-1 text-center">
              <p className="font-semibold text-primary">Selected Issue Location</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {position[0].toFixed(5)}, {position[1].toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating GPS button */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 px-2.5 bg-background/95 backdrop-blur-md border border-border shadow-md text-xs gap-1.5 hover:bg-muted"
          onClick={handleUseMyLocation}
        >
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span>My Location</span>
        </Button>
      </div>

      <div className="absolute bottom-2 left-2 z-[400] bg-background/90 backdrop-blur-md px-2 py-1 rounded text-[10px] text-muted-foreground border border-border">
        💡 Click on map to adjust exact pin
      </div>
    </div>
  );
}
