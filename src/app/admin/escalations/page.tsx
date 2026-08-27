import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ADMIN_NAV } from '@/types';
import { getEscalations } from '@/services/escalation.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { EscalationsTable } from '@/components/admin/escalations-table';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminEscalationsPage() {
  const supabase = createAdminClient();

  const [{ data: escalations, total }, deptsRes] = await Promise.all([
    getEscalations({ isResolved: false, pageSize: 100 }),
    supabase.from('departments').select('id, name').eq('is_active', true),
  ]);

  const departments = deptsRes.data || [];

  const l1Count = escalations.filter((e) => e.level === 'department_admin').length;
  const l2Count = escalations.filter((e) => e.level === 'super_admin').length;

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      title="City Command Center"
      subtitle="SLA Escalation Radar"
      requiredRole="super_admin"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            SLA Escalations & Overdue Radar
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-tier automatic escalations triggered for overdue civic complaints across all departments.
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Level 2 (City Admin)</p>
                <h3 className="text-2xl font-bold text-destructive">{l2Count}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Level 1 (Dept Admin)</p>
                <h3 className="text-2xl font-bold text-amber-600">{l1Count}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Active Escalations</p>
                <h3 className="text-2xl font-bold">{total}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <EscalationsTable
          initialEscalations={escalations}
          departments={departments}
        />
      </div>
    </DashboardShell>
  );
}
