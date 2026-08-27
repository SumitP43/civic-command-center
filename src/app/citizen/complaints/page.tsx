import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CITIZEN_NAV, STATUS_CONFIG, PRIORITY_RANGES } from '@/types';
import { getCurrentUser } from '@/services/auth.service';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Sparkles,
  Building2,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function CitizenComplaintsPage({ searchParams }: PageProps) {
  const { status, search } = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();

  let query = supabase
    .from('complaints')
    .select(`
      id,
      complaint_number,
      title,
      description,
      status,
      severity,
      priority_level,
      priority_score,
      address,
      created_at,
      department:departments(name),
      category:complaint_categories(name)
    `)
    .eq('citizen_id', user?.id || '')
    .order('created_at', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('status', status as any);
  }

  const { data: complaintsData } = await query;
  const complaints = complaintsData || [];

  return (
    <DashboardShell
      navItems={CITIZEN_NAV}
      title="My Complaints"
      subtitle="History of all your reported civic issues"
      requiredRole="citizen"
    >
      <div className="space-y-6">
        {/* Header & New Issue Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Complaint History</h1>
            <p className="text-sm text-muted-foreground">
              Track the progress, officer dispatch, and resolution verification for all your submitted issues.
            </p>
          </div>
          <Link href="/citizen/report">
            <Button className="gap-2 shadow-md hover:shadow-primary/20">
              <PlusCircle className="w-4 h-4" />
              Report New Issue
            </Button>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href="/citizen/complaints">
            <Button
              variant={!status || status === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
            >
              All ({complaints.length})
            </Button>
          </Link>
          <Link href="/citizen/complaints?status=IN_PROGRESS">
            <Button
              variant={status === 'IN_PROGRESS' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
            >
              In Progress
            </Button>
          </Link>
          <Link href="/citizen/complaints?status=RESOLVED">
            <Button
              variant={status === 'RESOLVED' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
            >
              Resolved
            </Button>
          </Link>
          <Link href="/citizen/complaints?status=CITIZEN_VERIFICATION">
            <Button
              variant={status === 'CITIZEN_VERIFICATION' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
            >
              Awaiting Verification
            </Button>
          </Link>
        </div>

        {/* Complaints List Card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            {complaints.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No complaints found</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {status
                      ? `No complaints currently matching filter "${status}".`
                      : 'You have not submitted any complaints yet.'}
                  </p>
                </div>
                <Link href="/citizen/report">
                  <Button size="sm" className="gap-2 mt-2">
                    <PlusCircle className="w-4 h-4" />
                    Report a Civic Issue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {complaints.map((c) => {
                  const statusConf = STATUS_CONFIG[c.status] || {
                    label: c.status,
                    color: '#6B7280',
                    bgColor: '#F3F4F6',
                  };
                  const priorityConf =
                    PRIORITY_RANGES[c.priority_level as keyof typeof PRIORITY_RANGES] ||
                    PRIORITY_RANGES.LOW;

                  return (
                    <div
                      key={c.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {c.complaint_number}
                          </span>
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                          >
                            {statusConf.label}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold"
                            style={{ borderColor: priorityConf.color, color: priorityConf.color }}
                          >
                            {c.priority_level}
                          </Badge>
                          {((Array.isArray(c.department) ? c.department[0]?.name : (c.department as any)?.name)) && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              {Array.isArray(c.department) ? c.department[0]?.name : (c.department as any)?.name}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/citizen/complaints/${c.id}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors block"
                        >
                          {c.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {c.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[240px]">{c.address}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <Link href={`/citizen/complaints/${c.id}`}>
                          <Button size="sm" variant="outline" className="gap-1 text-xs">
                            Track Progress
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
