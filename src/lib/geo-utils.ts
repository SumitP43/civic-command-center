import type { PriorityLevel } from '@/types';

export interface HotspotArea {
  id: string;
  name: string;
  lat: number;
  lon: number;
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  criticalCount: number;
  highCount: number;
  topCategory: string;
  trendPct: number;
}

export interface ComplaintGeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    complaint_number: string;
    title: string;
    category: string;
    priority_level: PriorityLevel;
    priority_score: number;
    severity: string;
    status: string;
    address: string;
    weight: number;
    department: string;
    assigned_officer?: string;
    created_at: string;
    sla_deadline?: string | null;
  };
}

export interface ComplaintGeoJSON {
  type: 'FeatureCollection';
  features: ComplaintGeoFeature[];
}

/**
 * Heatmap point tuple for leaflet.heat: [lat, lon, intensity]
 */
export type HeatLatLngTuple = [number, number, number];

/**
 * Priority Weight Mapping for Heatmap Intensity (0.0 to 1.0)
 * Critical = 1.0
 * High = 0.8
 * Medium = 0.5
 * Low = 0.25
 */
export function getPriorityWeight(priority: PriorityLevel | string): number {
  switch (priority) {
    case 'CRITICAL':
      return 1.0;
    case 'HIGH':
      return 0.8;
    case 'MEDIUM':
      return 0.5;
    case 'LOW':
      return 0.25;
    default:
      return 0.3;
  }
}

/**
 * Transform complaints into [lat, lon, weight] tuples for leaflet.heat
 */
export function complaintsToHeatPoints(complaints: any[]): HeatLatLngTuple[] {
  const points: HeatLatLngTuple[] = [];

  for (const c of complaints) {
    if (c.latitude == null || c.longitude == null) continue;

    const lat = Number(c.latitude);
    const lon = Number(c.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }

    const weight = getPriorityWeight(c.priority_level);
    points.push([lat, lon, weight]);
  }

  return points;
}

/**
 * Transform database complaints to standard GeoJSON FeatureCollection
 */
export function complaintsToGeoJSON(complaints: any[]): ComplaintGeoJSON {
  const features: ComplaintGeoFeature[] = [];

  for (const c of complaints) {
    if (c.latitude == null || c.longitude == null) continue;

    const lat = Number(c.latitude);
    const lon = Number(c.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }

    const activeAssignment = c.assignments?.find((a: any) => a.is_active);
    const officerName = activeAssignment?.officer?.profile?.full_name;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        id: c.id,
        complaint_number: c.complaint_number || 'N/A',
        title: c.title || 'Civic Issue',
        category: c.category?.name || 'General',
        priority_level: c.priority_level || 'MEDIUM',
        priority_score: c.priority_score || 50,
        severity: c.severity || 'Normal',
        status: c.status || 'SUBMITTED',
        address: c.address || 'Geo-coordinates on file',
        weight: getPriorityWeight(c.priority_level),
        department: c.department?.name || 'General Operations',
        assigned_officer: officerName,
        created_at: c.created_at,
        sla_deadline: c.sla_deadline,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Computes civic problem hotspots from spatial clusters and complaint distribution
 */
export function detectHotspotsFromComplaints(
  complaints: any[],
  minComplaintsPerArea = 2
): HotspotArea[] {
  const areaGroups: Record<
    string,
    {
      name: string;
      lats: number[];
      lons: number[];
      complaints: any[];
    }
  > = {};

  for (const c of complaints) {
    if (c.latitude == null || c.longitude == null) continue;

    const lat = Number(c.latitude);
    const lon = Number(c.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }

    let areaKey = 'Unknown Sector';
    if (c.address) {
      const parts = c.address.split(',');
      areaKey = parts[0]?.trim() || c.address.slice(0, 24);
    } else {
      const latGrid = Math.floor(lat * 100) / 100;
      const lonGrid = Math.floor(lon * 100) / 100;
      areaKey = `Sector ${latGrid}, ${lonGrid}`;
    }

    if (!areaGroups[areaKey]) {
      areaGroups[areaKey] = {
        name: areaKey,
        lats: [],
        lons: [],
        complaints: [],
      };
    }

    areaGroups[areaKey].lats.push(lat);
    areaGroups[areaKey].lons.push(lon);
    areaGroups[areaKey].complaints.push(c);
  }

  const hotspots: HotspotArea[] = [];

  for (const [key, group] of Object.entries(areaGroups)) {
    if (group.complaints.length < minComplaintsPerArea) continue;

    const total = group.complaints.length;
    const open = group.complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;
    const resolved = total - open;
    const critical = group.complaints.filter((c) => c.priority_level === 'CRITICAL').length;
    const high = group.complaints.filter((c) => c.priority_level === 'HIGH').length;

    const avgLat = group.lats.reduce((a, b) => a + b, 0) / group.lats.length;
    const avgLon = group.lons.reduce((a, b) => a + b, 0) / group.lons.length;

    const catCounts: Record<string, number> = {};
    for (const c of group.complaints) {
      const name = c.category?.name || 'General';
      catCounts[name] = (catCounts[name] || 0) + 1;
    }
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0] ? `${sortedCats[0][0]} (${Math.round((sortedCats[0][1] / total) * 100)}%)` : 'General';

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

    const recent = group.complaints.filter((c) => c.created_at >= sevenDaysAgo).length;
    const previous = group.complaints.filter((c) => c.created_at >= fourteenDaysAgo && c.created_at < sevenDaysAgo).length;

    const trendPct = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : (recent > 0 ? 100 : 0);

    hotspots.push({
      id: `hotspot-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: group.name,
      lat: avgLat,
      lon: avgLon,
      totalComplaints: total,
      openComplaints: open,
      resolvedComplaints: resolved,
      criticalCount: critical,
      highCount: high,
      topCategory,
      trendPct,
    });
  }

  return hotspots.sort((a, b) => (b.totalComplaints * 2 + b.criticalCount * 3) - (a.totalComplaints * 2 + a.criticalCount * 3));
}
