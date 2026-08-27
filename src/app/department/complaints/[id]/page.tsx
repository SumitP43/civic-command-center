import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getComplaintById } from '@/services/complaint.service';
import { getRecommendedOfficers } from '@/services/assignment.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  FileText,
  Shield,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { OfficerAssignDialog } from '@/components/officers/officer-assign-dialog';
import { ChangeDepartmentDialog } from '@/components/complaints/change-department-dialog';
import { OfficerWorkloadBar } from '@/components/officers/officer-workload-bar';
import { formatDistanceToNow, format } from 'date-fns';
import { getInitials } from '@/lib/utils';
import type { Department } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentComplaintDetailPage({ params }: PageProps) {
  const { id } = await params;
  const complaint = await getComplaintById(id);

  if (!complaint) {
    notFound();
  }

  const supabase = createAdminClient();

  const [departmentsRes, recommendations] = await Promise.all([
    supabase.from('departments').select('*').eq('is_active', true),
    complaint.department_id ? getRecommendedOfficers(complaint.id, complaint.department_id) : [],
  ]);

  const departments = (departmentsRes.data || []) as Department[];

  const activeAssignment = complaint.assignments?.find((a) => a.is_active);
  const assignedOfficer = activeAssignment?.officer;

  const isCritical = complaint.priority_level === 'CRITICAL';
  const isHigh = complaint.priority_level === 'HIGH';

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Complaint Management"
      subtitle={`Complaint #${complaint.complaint_number}`}
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/department/complaints"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-base text-primary">
                  {complaint.complaint_number}
                </span>
                <Badge
                  variant="outline"
                  className={`font-semibold ${
                    isCritical
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : isHigh
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {complaint.priority_level} ({complaint.priority_score}/100)
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  {complaint.status}
                </Badge>
              </div>
              <h2 className="text-xl font-bold mt-1">{complaint.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ChangeDepartmentDialog
              complaintId={complaint.id}
              currentDepartmentId={complaint.department_id}
              departments={departments}
            />
            <OfficerAssignDialog
              complaintId={complaint.id}
              departmentId={complaint.department_id || undefined}
              currentOfficerId={assignedOfficer?.id}
              isReassign={!!assignedOfficer}
            />
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Intelligence Card */}
            {complaint.ai_analysis && (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Sparkles className="h-4 w-4" />
                      <span>AI Operational Analysis</span>
                    </div>
                    {complaint.ai_confidence && (
                      <Badge variant="outline" className="text-xs bg-background">
                        Confidence: {Math.round(complaint.ai_confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {complaint.ai_summary && (
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Operational Summary</p>
                      <p className="text-sm">{complaint.ai_summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Recommended Dept</span>
                      <span className="font-semibold text-sm">{complaint.department?.name || 'Unassigned'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Detected Category</span>
                      <span className="font-semibold text-sm">{complaint.category?.name || 'General'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Assessed Severity</span>
                      <span className="font-semibold text-sm text-amber-600">{complaint.severity || 'Normal'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Primary Risk</span>
                      <span className="font-semibold text-sm">{complaint.ai_risk || 'Standard'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Complaint Details Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Citizen Complaint Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Description
                  </h4>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </div>

                {/* Location */}
                <div className="p-3 bg-muted/30 rounded-lg border flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Reported Location</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {complaint.address || 'Location coordinates on file'}
                    </p>
                    {complaint.landmark && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        Landmark: {complaint.landmark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Media Evidence */}
                {complaint.media && complaint.media.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Attached Media Evidence ({complaint.media.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {complaint.media.map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block aspect-video rounded-lg overflow-hidden border border-border bg-muted hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={m.url}
                            alt={m.caption || 'Evidence'}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                          />
                          {m.is_resolution_evidence && (
                            <Badge className="absolute bottom-1 right-1 text-[9px] bg-emerald-600">
                              Resolution Proof
                            </Badge>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Recommended Officers Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Recommended Field Officers
                  </CardTitle>
                  <OfficerAssignDialog
                    complaintId={complaint.id}
                    departmentId={complaint.department_id || undefined}
                    currentOfficerId={assignedOfficer?.id}
                    isReassign={!!assignedOfficer}
                  />
                </div>
                <CardDescription className="text-xs">
                  Automated matching ranked by proximity, workload capacity, and specialization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No active officers available for matching in this department.
                  </p>
                ) : (
                  recommendations.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.officer.id}
                      className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={item.officer.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {getInitials(item.officer.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {item.officer.profile?.full_name}
                            </span>
                            {idx === 0 && (
                              <Badge className="text-[9px] h-4 py-0 bg-primary/15 text-primary border-0">
                                Best Match
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Badge {item.officer.badge_number} • {item.officer.designation || 'Officer'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="w-32">
                          <OfficerWorkloadBar
                            active={item.officer.active_complaints}
                            max={item.officer.max_complaints}
                            showBadge={false}
                          />
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-primary">{item.score}/100</span>
                          <span className="block text-[10px] text-muted-foreground">Match Score</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Timeline of Updates */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Chronological Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {complaint.updates && complaint.updates.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {complaint.updates.map((u) => (
                      <div key={u.id} className="relative">
                        <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {u.new_status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(u.created_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </div>
                          {u.notes && (
                            <p className="text-xs text-foreground mt-1 bg-muted/30 p-2.5 rounded-lg border">
                              {u.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No updates logged yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar Column (1 Col) */}
          <div className="space-y-6">
            {/* Current Assignment Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Active Officer Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {assignedOfficer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={assignedOfficer.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                          {getInitials(assignedOfficer.profile?.full_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {assignedOfficer.profile?.full_name}
                        </h4>
                        <p className="text-muted-foreground">
                          Badge: {assignedOfficer.badge_number}
                        </p>
                        <p className="text-muted-foreground">
                          {assignedOfficer.designation || 'Field Officer'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <OfficerWorkloadBar
                        active={assignedOfficer.active_complaints}
                        max={assignedOfficer.max_complaints}
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <OfficerAssignDialog
                        complaintId={complaint.id}
                        departmentId={complaint.department_id || undefined}
                        currentOfficerId={assignedOfficer.id}
                        isReassign={true}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            Reassign to Different Officer
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed p-4">
                    <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Currently Unassigned</p>
                    <p className="text-muted-foreground mt-1 mb-3">
                      Assign a field officer to initiate site inspection and repair.
                    </p>
                    <OfficerAssignDialog
                      complaintId={complaint.id}
                      departmentId={complaint.department_id || undefined}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SLA & Deadlines Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  SLA & Timeline Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">{format(new Date(complaint.created_at), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">SLA Deadline:</span>
                  <span className="font-medium text-foreground">
                    {complaint.sla_deadline ? format(new Date(complaint.sla_deadline), 'dd MMM yyyy, HH:mm') : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Affected Citizens:</span>
                  <span className="font-medium">{complaint.affected_count || 1} people</span>
                </div>
                {complaint.resolved_at && (
                  <div className="flex justify-between py-1 border-b border-border/50 text-emerald-600">
                    <span>Resolved At:</span>
                    <span className="font-medium">{format(new Date(complaint.resolved_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Citizen Details Card */}
            {complaint.citizen && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Reporting Citizen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="font-semibold text-sm">{complaint.citizen.full_name}</p>
                  {complaint.citizen.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{complaint.citizen.phone}</span>
                    </div>
                  )}
                  {complaint.citizen.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{complaint.citizen.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Assignment History Card */}
            {complaint.assignments && complaint.assignments.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Assignment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {complaint.assignments.map((a, i) => (
                    <div key={a.id} className="p-2 rounded bg-muted/30 border text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{a.officer?.profile?.full_name || 'Officer'}</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 py-0">
                          {a.is_active ? 'Active' : 'Previous'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Assigned: {format(new Date(a.assigned_at), 'dd MMM, HH:mm')}
                      </p>
                      {a.unassigned_at && (
                        <p className="text-muted-foreground">
                          Unassigned: {format(new Date(a.unassigned_at), 'dd MMM, HH:mm')}
                        </p>
                      )}
                      {a.reassignment_reason && (
                        <p className="text-amber-600">
                          Reason: {a.reassignment_reason}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
