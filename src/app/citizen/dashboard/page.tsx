import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CITIZEN_NAV, STATUS_CONFIG, PRIORITY_RANGES } from '@/types';
import { getCurrentUser } from '@/services/auth.service';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Sparkles,
  Shield,
  Activity,
  UserCheck,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CitizenDashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Fetch complaints submitted by this citizen
  const { data: myComplaints } = await supabase
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
      sla_deadline,
      department:departments(name),
      category:complaint_categories(name)
    `)
    .eq('citizen_id', user?.id || '')
    .order('created_at', { ascending: false });

  // If new citizen has 0 complaints, fetch sample public complaints for display preview
  const complaints = myComplaints && myComplaints.length > 0 ? myComplaints : [];

  const totalReported = complaints.length;
  const inProgress = complaints.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'ACCEPTED' || c.status === 'ASSIGNED'
  ).length;
  const resolved = complaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  ).length;
  const awaitingVerification = complaints.filter(
    (c) => c.status === 'CITIZEN_VERIFICATION'
  ).length;

  return (
    <DashboardShell
      navItems={CITIZEN_NAV}
      title="Citizen Civic Portal"
      subtitle={`Welcome back, ${user?.full_name || 'Citizen'}`}
      requiredRole="citizen"
    >
      <div className="space-y-6">
        {/* Hero Action Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-blue-500/10 to-background border border-primary/20 p-6 md:p-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Assisted Resolution Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Report an Issue in Your Neighborhood
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Report potholes, streetlight outages, water leakages, or sanitation issues. 
              Our Gemini AI automatically detects the priority, routes it to the right department, and tracks officer dispatch in real time.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/citizen/report">
                <Button size="lg" className="gap-2 shadow-md hover:shadow-primary/20">
                  <PlusCircle className="w-4 h-4" />
                  Submit New Complaint
                </Button>
              </Link>
              <Link href="/admin/map">
                <Button size="lg" variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  View Incident Map
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Reported
                </p>
                <p className="text-2xl font-bold">{totalReported}</p>
                <p className="text-[11px] text-muted-foreground">All submitted issues</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-amber-500">{inProgress}</p>
                <p className="text-[11px] text-muted-foreground">Field team assigned</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <Activity className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resolved
                </p>
                <p className="text-2xl font-bold text-emerald-500">{resolved}</p>
                <p className="text-[11px] text-muted-foreground">Successfully closed</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Needs Verification
                </p>
                <p className="text-2xl font-bold text-blue-500">{awaitingVerification}</p>
                <p className="text-[11px] text-muted-foreground">Awaiting your feedback</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Complaints Section */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-semibold">My Active Complaints</CardTitle>
              <CardDescription>Live tracking and timeline of your submitted civic issues</CardDescription>
            </div>
            <Link href="/citizen/report">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <PlusCircle className="w-3.5 h-3.5" />
                New Issue
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {complaints.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No complaints submitted yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Have an issue in your area? Submit a photo or description, and our AI will route it immediately.
                  </p>
                </div>
                <Link href="/citizen/report">
                  <Button size="sm" className="gap-2 mt-2">
                    <PlusCircle className="w-4 h-4" />
                    Report Your First Issue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {complaints.map((complaint) => {
                  const statusConf = STATUS_CONFIG[complaint.status] || {
                    label: complaint.status,
                    color: '#6B7280',
                    bgColor: '#F3F4F6',
                  };
                  const priorityConf = PRIORITY_RANGES[complaint.priority_level as keyof typeof PRIORITY_RANGES] || PRIORITY_RANGES.LOW;

                  return (
                    <div
                      key={complaint.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 -mx-6 px-6 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {complaint.complaint_number}
                          </span>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                          >
                            {statusConf.label}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold"
                            style={{ borderColor: priorityConf.color, color: priorityConf.color }}
                          >
                            {complaint.priority_level}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm text-foreground leading-tight">
                          {complaint.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {complaint.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[200px]">{complaint.address}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <Link href={`/citizen/complaints/${complaint.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            Track Status
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
