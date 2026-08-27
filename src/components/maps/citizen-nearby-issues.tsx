'use client';

import { useMemo } from 'react';
import { calculateHaversineDistance } from '@/lib/assignment-scoring';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CitizenNearbyIssuesProps {
  complaints: any[];
  userLat?: number | null;
  userLon?: number | null;
  maxDistanceKm?: number;
}

export function CitizenNearbyIssues({
  complaints,
  userLat,
  userLon,
  maxDistanceKm = 10,
}: CitizenNearbyIssuesProps) {
  const nearbyComplaints = useMemo(() => {
    if (userLat == null || userLon == null) return [];

    const list = complaints
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => {
        const distance = calculateHaversineDistance(
          userLat,
          userLon,
          Number(c.latitude),
          Number(c.longitude)
        );
        return { ...c, distanceKm: distance };
      })
      .filter((c) => c.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return list;
  }, [complaints, userLat, userLon, maxDistanceKm]);

  if (userLat == null || userLon == null) {
    return (
      <Card className="border-dashed bg-muted/20 text-center p-6">
        <Navigation className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <h4 className="font-semibold text-xs">Location Access Required</h4>
        <p className="text-[11px] text-muted-foreground mt-1">
          Enable location to view civic issues and road repairs in your neighborhood.
        </p>
      </Card>
    );
  }

  if (nearbyComplaints.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20 text-center p-6">
        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
        <h4 className="font-semibold text-xs">No Active Issues Nearby</h4>
        <p className="text-[11px] text-muted-foreground mt-1">
          No civic issues reported within {maxDistanceKm} km of your current location.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-xs">Nearby Civic Incidents ({nearbyComplaints.length})</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Within {maxDistanceKm} km</span>
      </div>

      <div className="space-y-2.5">
        {nearbyComplaints.slice(0, 6).map((c) => {
          const isCritical = c.priority_level === 'CRITICAL';

          return (
            <Card key={c.id} className="border-border hover:border-primary/40 transition-colors">
              <CardContent className="p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground truncate">{c.title}</span>
                  <Badge variant="outline" className="text-[9px] py-0 h-4 shrink-0 bg-muted">
                    {c.distanceKm} km away
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {c.address || 'Reported Location'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[9px] py-0 h-3.5">
                    {c.category?.name || 'Civic Issue'}
                  </Badge>
                  <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
