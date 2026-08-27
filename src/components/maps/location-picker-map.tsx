'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

const DynamicLocationPicker = dynamic(
  () => import('./location-picker-map-inner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-xl border border-border bg-muted/20 flex flex-col items-center justify-center gap-2 animate-pulse">
        <MapPin className="h-6 w-6 text-primary animate-bounce" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading Interactive Map Pin Picker...
        </span>
      </div>
    ),
  }
);

export function LocationPickerMap(props: LocationPickerProps) {
  return <DynamicLocationPicker {...props} />;
}
