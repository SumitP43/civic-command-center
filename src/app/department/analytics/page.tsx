import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getAdminDepartmentId, getDepartmentAnalyticsData } from '@/services/department.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { DepartmentCharts } from '@/components/analytics/department-charts';

export const dynamic = 'force-dynamic';

export default async function DepartmentAnalyticsPage() {
  const departmentId = await getAdminDepartmentId();
  const supabase = createAdminClient();

  const [analyticsData, deptRes] = await Promise.all([
    departmentId ? getDepartmentAnalyticsData(departmentId) : {
      categoryData: [],
      statusData: [],
      priorityData: [],
      workloadData: [],
      slaComplianceRate: 100,
      totalComplaints: 0,
      resolvedComplaints: 0,
    },
    departmentId ? supabase.from('departments').select('name, code').eq('id', departmentId).single() : { data: null },
  ]);

  const deptTitle = deptRes.data ? `${deptRes.data.name} Analytics` : 'Department Analytics';

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Department Operational Analytics"
      subtitle={deptTitle}
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold">Performance & Resolution Metrics</h2>
          <p className="text-xs text-muted-foreground">
            Data insights on categorical distribution, SLA adherence rates, and officer utilization.
          </p>
        </div>

        <DepartmentCharts data={analyticsData} />
      </div>
    </DashboardShell>
  );
}
