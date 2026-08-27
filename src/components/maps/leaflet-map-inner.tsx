'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.heat';
import {
  complaintsToHeatPoints,
  detectHotspotsFromComplaints,
  type HotspotArea,
  type HeatLatLngTuple,
} from '@/lib/geo-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Flame,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Building2,
  X,
  Compass,
} from 'lucide-react';
import { MAP_CONFIG } from '@/types';
import Link from 'next/link';

// Custom SVG Pin Marker Creator
function createCustomIcon(priority: string) {
  let color = '#3b82f6'; // default blue
  if (priority === 'CRITICAL') color = '#ef4444'; // red
  else if (priority === 'HIGH') color = '#f97316'; // orange
  else if (priority === 'MEDIUM') color = '#eab308'; // yellow
  else if (priority === 'LOW') color = '#10b981'; // green

  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="26" height="34">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-pin',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

// Controller component to pan/zoom map programmatically
function MapController({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Heatmap Layer Controller component
function HeatmapLayer({ points, visible }: { points: HeatLatLngTuple[]; visible: boolean }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (visible && points.length > 0) {
      const heat = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 16,
        gradient: {
          0.2: '#3b82f6',
          0.4: '#10b981',
          0.6: '#eab308',
          0.8: '#f97316',
          1.0: '#ef4444',
        },
      });

      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, visible]);

  return null;
}

interface LeafletMapProps {
  initialComplaints: any[];
  departments?: { id: string; name: string }[];
  categories?: { id: string; name: string }[];
  height?: string;
  showHotspotsSidebar?: boolean;
}

export default function LeafletMapInner({
  initialComplaints,
  departments = [],
  categories = [],
  height = '650px',
  showHotspotsSidebar = true,
}: LeafletMapProps) {
  // Filter States
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Layer Controls
  const [showMarkers, setShowMarkers] = useState(true);
  const [enableClustering, setEnableClustering] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Selected Target
  const [panTarget, setPanTarget] = useState<{ center: [number, number]; zoom: number } | undefined>(undefined);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotArea | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(showHotspotsSidebar);

  // Safely extract unique severities from data
  const availableSeverities = useMemo(() => {
    const set = new Set<string>();
    for (const c of initialComplaints) {
      if (c.severity) set.add(c.severity);
    }
    return Array.from(set);
  }, [initialComplaints]);

  // Filter complaints safely (ignoring invalid or missing coordinates)
  const validFilteredComplaints = useMemo(() => {
    return initialComplaints.filter((c) => {
      // 1. Coordinate validity check
      if (c.latitude == null || c.longitude == null) return false;
      const lat = Number(c.latitude);
      const lon = Number(c.longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return false;
      }

      // 2. Search query filter
      if (search) {
        const s = search.toLowerCase();
        const matchNum = c.complaint_number?.toLowerCase().includes(s);
        const matchTitle = c.title?.toLowerCase().includes(s);
        const matchAddr = c.address?.toLowerCase().includes(s);
        if (!matchNum && !matchTitle && !matchAddr) return false;
      }

      // 3. Category & Department filters
      if (priorityFilter !== 'ALL' && c.priority_level !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
      if (departmentFilter !== 'ALL' && c.department_id !== departmentFilter) return false;
      if (categoryFilter !== 'ALL' && c.category_id !== categoryFilter) return false;

      return true;
    });
  }, [
    initialComplaints,
    search,
    priorityFilter,
    statusFilter,
    severityFilter,
    departmentFilter,
    categoryFilter,
  ]);

  // Heatmap Points
  const heatPoints = useMemo(() => complaintsToHeatPoints(validFilteredComplaints), [validFilteredComplaints]);

  // Hotspots Calculation
  const hotspots = useMemo(() => detectHotspotsFromComplaints(validFilteredComplaints), [validFilteredComplaints]);

  // Default Center (Noida center or centroid of complaints)
  const defaultPosition: [number, number] = useMemo(() => {
    if (validFilteredComplaints.length > 0) {
      const lat = Number(validFilteredComplaints[0].latitude);
      const lon = Number(validFilteredComplaints[0].longitude);
      return [lat, lon];
    }
    return [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng];
  }, [validFilteredComplaints]);

  // Pan to Hotspot
  function handleSelectHotspot(h: HotspotArea) {
    setSelectedHotspot(h);
    setPanTarget({ center: [h.lat, h.lon], zoom: 15 });
  }

  // Render individual markers
  const renderMarkers = () => {
    return validFilteredComplaints.map((c) => {
      const lat = Number(c.latitude);
      const lon = Number(c.longitude);
      const icon = createCustomIcon(c.priority_level || 'MEDIUM');
      const isCritical = c.priority_level === 'CRITICAL';
      const isHigh = c.priority_level === 'HIGH';
      const activeAssignment = c.assignments?.find((a: any) => a.is_active);

      return (
        <Marker key={c.id} position={[lat, lon]} icon={icon}>
          <Popup className="civic-custom-popup">
            <div className="p-3.5 space-y-2.5 min-w-[240px] max-w-[280px] text-xs">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                <span className="font-mono font-bold text-xs text-primary">
                  {c.complaint_number}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 h-4 font-semibold ${
                    isCritical
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : isHigh
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.priority_level} ({c.priority_score}/100)
                </Badge>
              </div>

              {/* Title & Address */}
              <div>
                <h4 className="font-bold text-sm leading-tight text-foreground">{c.title}</h4>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{c.address || 'Geo-coordinates on file'}</span>
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-muted/40 rounded-lg text-[10px]">
                <div>
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-semibold text-foreground truncate block">
                    {c.category?.name || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Severity</span>
                  <span className="font-semibold text-foreground">{c.severity || 'Normal'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <span className="font-semibold text-foreground">{c.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Department</span>
                  <span className="font-semibold text-foreground truncate block">
                    {c.department?.name || 'General'}
                  </span>
                </div>
              </div>

              {/* Detail Action Link */}
              <div className="pt-1">
                <Link
                  href={`/department/complaints/${c.id}`}
                  className="inline-flex items-center justify-center w-full text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Inspect Case Details
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Layer Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-8 gap-2.5 bg-muted/40 p-3.5 rounded-xl border border-border">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search complaint #, address, issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        {/* Priority Filter */}
        <div>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || 'ALL')}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'ALL')}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="AI_ANALYZED">AI Analyzed</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v || 'ALL')}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Severities</SelectItem>
              {availableSeverities.map((sev) => (
                <SelectItem key={sev} value={sev}>{sev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || 'ALL')}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Department Filter */}
        {departments.length > 0 && (
          <div>
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v || 'ALL')}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Depts</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Hotspots Drawer Toggle */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 text-xs gap-1 w-full cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Hotspots ({hotspots.length})</span>
          </Button>
        </div>
      </div>

      {/* Layer Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          {/* Markers Toggle */}
          <Button
            variant={showMarkers ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMarkers(!showMarkers)}
            className="h-7 text-[11px] gap-1 cursor-pointer"
          >
            <MapPin className="h-3 w-3" />
            <span>Markers: {showMarkers ? 'On' : 'Off'}</span>
          </Button>

          {/* Clusters Toggle */}
          <Button
            variant={enableClustering ? 'default' : 'outline'}
            size="sm"
            disabled={!showMarkers}
            onClick={() => setEnableClustering(!enableClustering)}
            className="h-7 text-[11px] gap-1 cursor-pointer"
          >
            <Layers className="h-3 w-3" />
            <span>Clusters: {enableClustering ? 'On' : 'Off'}</span>
          </Button>

          {/* Heatmap Toggle */}
          <Button
            variant={showHeatmap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="h-7 text-[11px] gap-1 cursor-pointer"
          >
            <Flame className="h-3 w-3" />
            <span>Heatmap: {showHeatmap ? 'On' : 'Off'}</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>Active Map Incidents: <strong className="text-foreground">{validFilteredComplaints.length}</strong></span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> High
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Low
          </span>
        </div>
      </div>

      {/* Map Layout Container */}
      <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm bg-card" style={{ height }}>
        {/* Leaflet MapContainer */}
        <MapContainer
          center={defaultPosition}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap TileLayer with Proper Attribution */}
          <TileLayer
            attribution={MAP_CONFIG.OSM_ATTRIBUTION}
            url={MAP_CONFIG.OSM_TILE_URL}
          />

          {/* Programmatic Pan Controller */}
          <MapController center={panTarget?.center} zoom={panTarget?.zoom} />

          {/* Heatmap Layer */}
          <HeatmapLayer points={heatPoints} visible={showHeatmap} />

          {/* Complaint Markers (with or without clustering) */}
          {showMarkers && (
            enableClustering ? (
              <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                maxClusterRadius={50}
              >
                {renderMarkers()}
              </MarkerClusterGroup>
            ) : (
              renderMarkers()
            )
          )}
        </MapContainer>

        {/* Hotspots Sidebar Drawer */}
        {sidebarOpen && (
          <div className="absolute top-0 right-0 bottom-0 z-[1000] w-72 sm:w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl p-4 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-500" />
                <h3 className="font-bold text-sm">Civic Problem Hotspots</h3>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {hotspots.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No concentrated statistical hotspots detected for current filters.
              </div>
            ) : (
              <div className="space-y-3">
                {hotspots.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleSelectHotspot(h)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 text-xs ${
                      selectedHotspot?.id === h.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-muted/20 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs truncate max-w-[170px]">{h.name}</h4>
                      <Badge className="text-[10px] h-4 py-0 bg-red-500/15 text-red-600 border-0">
                        {h.totalComplaints} cases
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Primary: <span className="font-medium text-foreground">{h.topCategory}</span>
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t text-center">
                      <div className="bg-background p-1 rounded">
                        <span className="block font-bold text-destructive">{h.criticalCount}</span>
                        <span className="text-muted-foreground">Critical</span>
                      </div>
                      <div className="bg-background p-1 rounded">
                        <span className="block font-bold text-amber-600">{h.openComplaints}</span>
                        <span className="text-muted-foreground">Open</span>
                      </div>
                      <div className="bg-background p-1 rounded">
                        <span className="block font-bold text-emerald-600">{h.resolvedComplaints}</span>
                        <span className="text-muted-foreground">Done</span>
                      </div>
                    </div>

                    {h.trendPct !== 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span>Trend: <strong className="text-red-500">+{h.trendPct}%</strong> this week</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
