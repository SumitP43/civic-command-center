import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getAdminDepartmentId, getDepartmentComplaints } from '@/services/department.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { DepartmentComplaintsTable } from '@/components/complaints/department-complaints-table';
import type { ComplaintCategory } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DepartmentComplaintsPage() {
  const departmentId = await getAdminDepartmentId();
  const supabase = createAdminClient();

  const [complaintsRes, categoriesRes, deptRes] = await Promise.all([
    departmentId ? getDepartmentComplaints(departmentId, { pageSize: 100 }) : { data: [], total: 0 },
    departmentId ? supabase.from('complaint_categories').select('*').eq('department_id', departmentId) : { data: [] },
    departmentId ? supabase.from('departments').select('name, code').eq('id', departmentId).single() : { data: null },
  ]);

  const deptTitle = deptRes.data ? `${deptRes.data.name} Complaints Queue` : 'Department Complaints Queue';

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Department Complaint Queue"
      subtitle={deptTitle}
      requiredRole="department_admin"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Manage & Dispatch Complaints</h2>
          <p className="text-xs text-muted-foreground">
            Filter by severity, priority, or SLA deadline to assign available field personnel.
          </p>
        </div>

        <DepartmentComplaintsTable
          initialComplaints={complaintsRes.data}
          categories={(categoriesRes.data || []) as ComplaintCategory[]}
          departmentId={departmentId || ''}
        />
      </div>
    </DashboardShell>
  );
}
