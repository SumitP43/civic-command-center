import { describe, it, expect } from 'vitest';
import {
  complaintsToGeoJSON,
  complaintsToHeatPoints,
  detectHotspotsFromComplaints,
  getPriorityWeight,
} from '@/lib/geo-utils';

describe('Geospatial & Hotspot Detection Engine', () => {
  const mockComplaints = [
    {
      id: 'c-1',
      complaint_number: 'C-001',
      title: 'Water pipe leak',
      latitude: 28.5355,
      longitude: 77.3910,
      priority_level: 'CRITICAL',
      status: 'IN_PROGRESS',
      address: 'Sector 62, Noida',
      category: { name: 'Water Supply' },
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-2',
      complaint_number: 'C-002',
      title: 'Road pothole',
      latitude: 28.5360,
      longitude: 77.3915,
      priority_level: 'HIGH',
      status: 'SUBMITTED',
      address: 'Sector 62, Noida',
      category: { name: 'Road Infrastructure' },
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-3',
      complaint_number: 'C-003',
      title: 'Broken streetlight',
      latitude: 28.5708,
      longitude: 77.3271,
      priority_level: 'LOW',
      status: 'RESOLVED',
      address: 'Sector 18, Noida',
      category: { name: 'Street Lighting' },
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-4',
      complaint_number: 'C-004',
      title: 'Invalid coordinates item',
      latitude: null,
      longitude: null,
      priority_level: 'MEDIUM',
      status: 'SUBMITTED',
    },
  ];

  it('assigns correct priority weights for heatmap intensity (Critical: 1.0, High: 0.8, Medium: 0.5, Low: 0.25)', () => {
    expect(getPriorityWeight('CRITICAL')).toBe(1.0);
    expect(getPriorityWeight('HIGH')).toBe(0.8);
    expect(getPriorityWeight('MEDIUM')).toBe(0.5);
    expect(getPriorityWeight('LOW')).toBe(0.25);
  });

  it('converts valid complaints to [lat, lon, weight] tuples for leaflet.heat', () => {
    const heatPoints = complaintsToHeatPoints(mockComplaints);

    expect(heatPoints.length).toBe(3);
    expect(heatPoints[0]).toEqual([28.5355, 77.3910, 1.0]);
    expect(heatPoints[1]).toEqual([28.5360, 77.3915, 0.8]);
    expect(heatPoints[2]).toEqual([28.5708, 77.3271, 0.25]);
  });

  it('transforms valid database complaints into standard GeoJSON and skips invalid coordinates', () => {
    const geojson = complaintsToGeoJSON(mockComplaints);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(3);

    const first = geojson.features[0];
    expect(first.geometry.type).toBe('Point');
    expect(first.geometry.coordinates).toEqual([77.3910, 28.5355]);
    expect(first.properties.complaint_number).toBe('C-001');
    expect(first.properties.weight).toBe(1.0);
  });

  it('identifies spatial clusters and ranks hotspots by complaint concentration and criticality', () => {
    const hotspots = detectHotspotsFromComplaints(mockComplaints, 2);

    expect(hotspots.length).toBe(1);
    expect(hotspots[0].name).toContain('Sector 62');
    expect(hotspots[0].totalComplaints).toBe(2);
    expect(hotspots[0].criticalCount).toBe(1);
    expect(hotspots[0].openComplaints).toBe(2);
    expect(hotspots[0].resolvedComplaints).toBe(0);
  });
});
