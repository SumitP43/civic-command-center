import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getAdminDepartmentId, getDepartmentStats, getDepartmentComplaints, getDepartmentOfficers } from '@/services/department.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Flame,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { OfficerAssignDialog } from '@/components/officers/officer-assign-dialog';
import { OfficerWorkloadBar } from '@/components/officers/officer-workload-bar';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DepartmentDashboardPage() {
  const departmentId = await getAdminDepartmentId();
  const supabase = createAdminClient();

  let deptName = 'Department Operations';
  if (departmentId) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name, code')
      .eq('id', departmentId)
      .single();
    if (dept) {
      deptName = `${dept.name} (${dept.code})`;
    }
  }

  const [stats, priorityQueue, officers] = await Promise.all([
    departmentId ? getDepartmentStats(departmentId) : {
      total: 0, new: 0, assigned: 0, in_progress: 0, resolved: 0, critical: 0, sla_approaching: 0, sla_breached: 0
    },
    departmentId ? getDepartmentComplaints(departmentId, { sortBy: 'priority_desc', pageSize: 6 }) : { data: [], total: 0 },
    departmentId ? getDepartmentOfficers(departmentId) : [],
  ]);

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Department Command Center"
      subtitle={deptName}
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        {/* SLA Breach Alert Banner */}
        {stats.sla_breached > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive text-destructive-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-destructive">
                  {stats.sla_breached} SLA Breach{stats.sla_breached > 1 ? 'es' : ''} Detected
                </h4>
                <p className="text-xs text-muted-foreground">
                  Immediate dispatch or escalation required for overdue civic complaints.
                </p>
              </div>
            </div>
            <Link
              href="/department/complaints?status=ALL&sortBy=sla_asc"
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              View Breached
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Complaints</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">New / Unassigned</p>
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.new}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">In Progress</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.in_progress}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Resolved</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolved}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Critical Priority</p>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Assigned Cases</p>
                <h3 className="text-2xl font-bold">{stats.assigned}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">SLA &lt; 12h</p>
                <h3 className="text-2xl font-bold text-amber-600">{stats.sla_approaching}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">SLA Breached</p>
                <h3 className="text-2xl font-bold text-destructive">{stats.sla_breached}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA Health Distribution Bar */}
        {stats.total > 0 && (
          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Department SLA Health Performance
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-600">
                    ● Healthy: {stats.total > 0 ? Math.max(0, Math.round(((stats.total - stats.sla_approaching - stats.sla_breached) / stats.total) * 100)) : 100}%
                  </span>
                  <span className="text-amber-600">
                    ● Approaching: {stats.total > 0 ? Math.round((stats.sla_approaching / stats.total) * 100) : 0}%
                  </span>
                  <span className="text-destructive">
                    ● Breached: {stats.total > 0 ? Math.round((stats.sla_breached / stats.total) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.total > 0 ? Math.max(0, Math.round(((stats.total - stats.sla_approaching - stats.sla_breached) / stats.total) * 100)) : 100}%` }}
                  className="bg-emerald-500 transition-all"
                />
                <div
                  style={{ width: `${stats.total > 0 ? Math.round((stats.sla_approaching / stats.total) * 100) : 0}%` }}
                  className="bg-amber-500 transition-all"
                />
                <div
                  style={{ width: `${stats.total > 0 ? Math.round((stats.sla_breached / stats.total) * 100) : 0}%` }}
                  className="bg-destructive transition-all"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two-Column Section: Priority Action Queue & Officer Workload Glance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Queue (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Priority Action Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Highest priority complaints requiring smart officer assignment or dispatch.
                </p>
              </div>
              <Link
                href="/department/complaints"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                View All ({priorityQueue.total})
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {priorityQueue.data.length === 0 ? (
              <Card className="p-8 text-center bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-sm">No Pending Complaints</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All department complaints are currently assigned or resolved.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {priorityQueue.data.map((c) => {
                  const isCritical = c.priority_level === 'CRITICAL';
                  const isHigh = c.priority_level === 'HIGH';

                  return (
                    <Card key={c.id} className="border-border hover:border-primary/40 transition-all">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-primary">
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
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              {c.status}
                            </Badge>
                            {c.category && (
                              <span className="text-[11px] text-muted-foreground">
                                • {c.category.name}
                              </span>
                            )}
                          </div>

                          <h4 className="font-semibold text-sm line-clamp-1">{c.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.ai_summary || c.description}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            {c.address && <span>• {c.address}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {c.status === 'SUBMITTED' || c.status === 'AI_ANALYZED' ? (
                            <OfficerAssignDialog
                              complaintId={c.id}
                              departmentId={departmentId || undefined}
                            />
                          ) : (
                            <Link
                              href={`/department/complaints/${c.id}`}
                              className="inline-flex items-center text-xs font-medium border border-input rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
                            >
                              View Details
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Officer Capacity Overview (1 Col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Officer Workloads</h3>
                <p className="text-xs text-muted-foreground">
                  Active staff & capacity distribution.
                </p>
              </div>
              <Link
                href="/department/officers"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Manage ({officers.length})
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                {officers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No active officers in this department.
                  </p>
                ) : (
                  officers.slice(0, 6).map((o) => (
                    <div key={o.id} className="space-y-1.5 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          href={`/department/officers/${o.id}`}
                          className="font-medium hover:text-primary transition-colors truncate max-w-[140px]"
                        >
                          {o.profile?.full_name || 'Officer'}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {o.badge_number}
                        </span>
                      </div>
                      <OfficerWorkloadBar
                        active={o.active_complaints}
                        max={o.max_complaints}
                        showBadge={true}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
