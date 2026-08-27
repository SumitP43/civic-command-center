import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ADMIN_NAV } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { RealtimeKpiCards } from '@/components/admin/realtime-kpi-cards';
import { LiveActivityFeed } from '@/components/admin/live-activity-feed';
import { LeafletMap } from '@/components/maps/leaflet-map';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ShieldAlert,
  MapPin,
  Flame,
  ArrowRight,
  TrendingUp,
  Brain,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Fetch initial command center data in parallel
  const [
    statsRes,
    complaintsRes,
    deptsRes,
    updatesRes,
    hotspotsRes,
    escalationsCountRes,
  ] = await Promise.all([
    supabase.rpc('get_admin_command_center_stats'),
    supabase
      .from('complaints')
      .select(`
        id,
        complaint_number,
        title,
        latitude,
        longitude,
        priority_level,
        priority_score,
        severity,
        status,
        address,
        created_at,
        sla_deadline,
        department:departments(name),
        category:complaint_categories(name),
        assignments:complaint_assignments(
          is_active,
          officer:officers(profile:profiles(full_name))
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('departments').select('*').eq('is_active', true),
    supabase
      .from('complaint_updates')
      .select('id, new_status, notes, created_at, complaint_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('get_city_hotspots', { p_min_complaints: 2, p_limit: 5 }),
    supabase.from('escalations').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
  ]);

  const defaultStats = {
    total: 0,
    active: 0,
    critical: 0,
    high: 0,
    in_progress: 0,
    resolved: 0,
    sla_approaching: 0,
    sla_breached: 0,
    escalations_pending: escalationsCountRes.count || 0,
  };

  const stats = (statsRes.data as any) || defaultStats;
  stats.escalations_pending = escalationsCountRes.count || 0;

  const complaints = complaintsRes.data || [];
  const departments = deptsRes.data || [];
  const hotspots = (hotspotsRes.data as any[]) || [];

  const initialActivity = (updatesRes.data || []).map((u: any) => ({
    id: u.id,
    type: u.new_status || 'update',
    title: `Status: ${u.new_status}`,
    description: u.notes || 'Field team status update recorded.',
    timestamp: u.created_at,
    complaintId: u.complaint_id,
  }));

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      title="City Command Center"
      subtitle="Executive Realtime Operations"
      requiredRole="super_admin"
    >
      <div className="space-y-6">
        {/* Header and Quick Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Executive Command Radar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live multi-department civic monitoring, geospatial analytics, and automated SLA enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/escalations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted/50 transition-colors shadow-sm text-destructive"
            >
              <ShieldAlert className="h-4 w-4" />
              Escalations Radar ({stats.escalations_pending})
            </Link>
            <Link
              href="/admin/map"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <MapPin className="h-4 w-4" />
              Fullscreen Map
            </Link>
          </div>
        </div>

        {/* 8 Real-time Live KPI Cards */}
        <RealtimeKpiCards initialStats={stats} />

        {/* 2-Column Section: Live Interactive Map Preview (2 Cols) + Real-time Activity Feed (1 Col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Preview (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Geospatial Incident Radar</h3>
              </div>
              <Link
                href="/admin/map"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Expand City Map
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <LeafletMap
              initialComplaints={complaints}
              departments={departments}
              height="460px"
              showHotspotsSidebar={true}
            />
          </div>

          {/* Live Activity Feed (1 Col) */}
          <div className="space-y-4">
            <LiveActivityFeed initialEvents={initialActivity} />
          </div>
        </div>

        {/* 2-Column Bottom Section: Department Performance & Top Problem Hotspots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Operational Overview */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Department Roster</CardTitle>
                </div>
                <Link
                  href="/admin/departments"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  View All ({departments.length}) →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {departments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active departments found.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {departments.slice(0, 5).map((d) => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{d.name}</h4>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{d.code} • {d.contact_email || 'dept@civic.gov'}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                        Active Operations
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hotspots Overview */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <CardTitle className="text-sm font-semibold">Civic Problem Hotspots</CardTitle>
                </div>
                <Link
                  href="/admin/map"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  Inspect Radar →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hotspots.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No concentrated hotspots detected.</p>
              ) : (
                <div className="space-y-2.5">
                  {hotspots.slice(0, 4).map((h: any) => (
                    <div key={h.area_name} className="p-3 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-3 text-xs">
                      <div>
                        <h4 className="font-bold text-xs">{h.area_name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Top: <span className="font-medium text-foreground">{h.top_category || 'General'}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm text-red-600 block">{h.total_complaints} incidents</span>
                        {h.recent_growth_pct > 0 && (
                          <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 justify-end">
                            <TrendingUp className="h-3 w-3" />
                            +{h.recent_growth_pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
