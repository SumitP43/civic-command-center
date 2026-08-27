import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OFFICER_NAV } from '@/types';
import { getCurrentOfficerId, getOfficerDashboardStats, getOfficerComplaints } from '@/services/officer-complaint.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  MapPin,
  ListOrdered,
} from 'lucide-react';
import { SlaCountdownBadge } from '@/components/complaints/sla-countdown-badge';
import { formatDistanceToNow, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function OfficerDashboardPage() {
  const officerId = await getCurrentOfficerId();

  const [stats, complaints] = await Promise.all([
    officerId ? getOfficerDashboardStats(officerId) : {
      assigned: 0, critical: 0, highPriority: 0, inProgress: 0, completed: 0, slaApproaching: 0, slaBreached: 0
    },
    officerId ? getOfficerComplaints(officerId) : [],
  ]);

  // Strict sorting for Officer Priority Queue:
  // 1. Breached SLA
  // 2. Approaching SLA (< 12h)
  // 3. Critical Priority
  // 4. High Priority
  // 5. Oldest Created
  const now = new Date().getTime();
  const next12h = now + 12 * 3600 * 1000;

  const sortedPriorityQueue = [...complaints].sort((a, b) => {
    const aBreached = a.sla_breached || (a.sla_deadline && new Date(a.sla_deadline).getTime() < now);
    const bBreached = b.sla_breached || (b.sla_deadline && new Date(b.sla_deadline).getTime() < now);
    if (aBreached && !bBreached) return -1;
    if (!aBreached && bBreached) return 1;

    const aApproaching = a.sla_deadline && new Date(a.sla_deadline).getTime() <= next12h;
    const bApproaching = b.sla_deadline && new Date(b.sla_deadline).getTime() <= next12h;
    if (aApproaching && !bApproaching) return -1;
    if (!aApproaching && bApproaching) return 1;

    if (a.priority_level === 'CRITICAL' && b.priority_level !== 'CRITICAL') return -1;
    if (a.priority_level !== 'CRITICAL' && b.priority_level === 'CRITICAL') return 1;

    if (a.priority_level === 'HIGH' && b.priority_level !== 'HIGH') return -1;
    if (a.priority_level !== 'HIGH' && b.priority_level === 'HIGH') return 1;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <DashboardShell
      navItems={OFFICER_NAV}
      title="Field Officer Dashboard"
      subtitle="Priority Action Radar"
      requiredRole="officer"
    >
      <div className="space-y-6">
        {/* SLA Alert Banner */}
        {stats.slaBreached > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive text-destructive-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-destructive">
                  {stats.slaBreached} Overdue Task{stats.slaBreached > 1 ? 's' : ''} Require Immediate Action
                </h4>
                <p className="text-xs text-muted-foreground">
                  SLA target expired. Complete site inspection or submit resolution evidence immediately.
                </p>
              </div>
            </div>
            <Link
              href="/officer/complaints?status=IN_PROGRESS"
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              View Overdue
            </Link>
          </div>
        )}

        {/* Officer Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Assigned</p>
                <h3 className="text-2xl font-bold">{stats.assigned + stats.inProgress}</h3>
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
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">SLA Approaching</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.slaApproaching}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Resolved by Me</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* "My Priority Queue" */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-base font-semibold">My Priority Execution Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Sorted strictly by SLA breach status, urgency countdown, criticality, and age.
                </p>
              </div>
            </div>
            <Link
              href="/officer/complaints"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              View All Assigned ({complaints.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {sortedPriorityQueue.length === 0 ? (
            <Card className="p-12 text-center bg-muted/20 border-dashed">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-base">All Caught Up!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You have no pending complaints in your queue.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedPriorityQueue.slice(0, 8).map((c) => {
                const isCritical = c.priority_level === 'CRITICAL';
                const isHigh = c.priority_level === 'HIGH';

                return (
                  <Card key={c.id} className="border-border hover:border-primary/40 transition-all">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
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
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">
                            {c.status}
                          </Badge>
                          <SlaCountdownBadge
                            deadline={c.sla_deadline}
                            status={c.status}
                            slaBreached={c.sla_breached}
                            createdAt={c.created_at}
                          />
                        </div>

                        <h4 className="font-semibold text-sm">{c.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {c.ai_summary || c.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                          {c.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              {c.address}
                            </span>
                          )}
                          <span>• Reported {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/officer/complaints/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Open Workspace
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
