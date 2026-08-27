import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OFFICER_NAV } from '@/types';
import { LeafletMap } from '@/components/maps/leaflet-map';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function OfficerMapPage() {
  const supabase = createAdminClient();

  const [complaintsRes, deptsRes] = await Promise.all([
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
        category:complaint_categories(name)
      `)
      .order('created_at', { ascending: false })
      .limit(150),
    supabase.from('departments').select('id, name').eq('is_active', true),
  ]);

  return (
    <DashboardShell
      navItems={OFFICER_NAV}
      title="Field Incident Map"
      subtitle="Geospatial task locator across municipal sectors"
      requiredRole="officer"
    >
      <div className="space-y-4">
        <LeafletMap
          initialComplaints={complaintsRes.data || []}
          departments={deptsRes.data || []}
          height="620px"
          showHotspotsSidebar={true}
        />
      </div>
    </DashboardShell>
  );
}
