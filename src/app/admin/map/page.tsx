import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ADMIN_NAV } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeafletMap } from '@/components/maps/leaflet-map';
import { MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminMapPage() {
  const supabase = createAdminClient();

  const [complaintsRes, deptsRes, catsRes] = await Promise.all([
    supabase
      .from('complaints')
      .select(`
        *,
        department:departments(id, name, code),
        category:complaint_categories(id, name),
        assignments:complaint_assignments(
          is_active,
          officer:officers(
            id,
            badge_number,
            profile:profiles(full_name)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('departments').select('id, name').eq('is_active', true),
    supabase.from('complaint_categories').select('id, name').eq('is_active', true),
  ]);

  const complaints = complaintsRes.data || [];
  const departments = deptsRes.data || [];
  const categories = catsRes.data || [];

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      title="City Command Center"
      subtitle="Geospatial Map & Hotspot Radar"
      requiredRole="super_admin"
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Live City Incident Map
          </h1>
          <p className="text-xs text-muted-foreground">
            Geospatial clustering, priority-weighted heatmaps, and automated problem hotspot detection powered by OpenStreetMap.
          </p>
        </div>

        <LeafletMap
          initialComplaints={complaints}
          departments={departments}
          categories={categories}
          height="calc(100vh - 220px)"
          showHotspotsSidebar={true}
        />
      </div>
    </DashboardShell>
  );
}
