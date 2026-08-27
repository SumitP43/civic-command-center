'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

interface LeafletMapProps {
  initialComplaints: any[];
  departments?: { id: string; name: string }[];
  categories?: { id: string; name: string }[];
  height?: string;
  showHotspotsSidebar?: boolean;
}

const DynamicLeafletMap = dynamic(
  () => import('./leaflet-map-inner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] rounded-2xl border border-border bg-muted/20 flex flex-col items-center justify-center gap-3 animate-pulse">
        <MapPin className="h-8 w-8 text-primary animate-bounce" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading OpenStreetMap & Spatial Incidents Radar...
        </span>
      </div>
    ),
  }
);

export function LeafletMap(props: LeafletMapProps) {
  return <DynamicLeafletMap {...props} />;
}
