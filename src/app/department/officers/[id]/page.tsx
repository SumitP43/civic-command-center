import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getOfficerDetailWithPerformance } from '@/services/department.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Shield,
  Star,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Flame,
  FileText,
  Calendar,
} from 'lucide-react';
import { OfficerWorkloadBar } from '@/components/officers/officer-workload-bar';
import { getInitials } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentOfficerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getOfficerDetailWithPerformance(id);

  if (!data) {
    notFound();
  }

  const { officer, assignments, metrics } = data;

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Officer Performance Profile"
      subtitle={`${officer.profile?.full_name} (${officer.badge_number})`}
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        {/* Back link & Officer Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/department/officers"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={officer.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                {getInitials(officer.profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{officer.profile?.full_name}</h2>
                <Badge variant="outline" className="capitalize font-medium">
                  {officer.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Badge: {officer.badge_number} • {officer.designation || 'Field Specialist'} • {officer.department?.name}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Resolved</p>
                <h3 className="text-2xl font-bold text-emerald-600">{metrics.totalResolved}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">SLA Compliance</p>
                <h3 className="text-2xl font-bold text-blue-600">{metrics.slaComplianceRate}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Citizen Rating</p>
                <h3 className="text-2xl font-bold text-amber-600">{metrics.rating} / 5.0</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Resolution</p>
                <h3 className="text-2xl font-bold">{metrics.avgResolutionHours}h</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned & Completed Complaints (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold">Assigned Complaint History</h3>

            {assignments.length === 0 ? (
              <Card className="p-8 text-center bg-muted/20">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-semibold text-sm">No Assignment History</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This officer has not been assigned any complaints yet.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const c = a.complaint;
                  if (!c) return null;

                  return (
                    <Card key={a.id} className="border-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-primary">
                              {c.complaint_number}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {c.priority_level} ({c.priority_score})
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              {c.status}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-sm">{c.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Assigned {formatDistanceToNow(new Date(a.assigned_at), { addSuffix: true })}
                            {c.resolved_at && ` • Resolved on ${format(new Date(c.resolved_at), 'dd MMM yyyy')}`}
                          </p>
                        </div>

                        <Link
                          href={`/department/complaints/${c.id}`}
                          className="inline-flex items-center text-xs font-medium border border-input rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors shrink-0"
                        >
                          View Case
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Officer Details Sidebar (1 Col) */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Active Workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <OfficerWorkloadBar
                  active={officer.active_complaints}
                  max={officer.max_complaints}
                />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Contact & Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {officer.profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{officer.profile.phone}</span>
                  </div>
                )}
                {officer.profile?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{officer.profile.email}</span>
                  </div>
                )}
                {officer.profile?.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{officer.profile.city}, {officer.profile.state}</span>
                  </div>
                )}
                <div className="pt-2 border-t text-muted-foreground">
                  Joined: {format(new Date(officer.created_at), 'MMMM yyyy')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
