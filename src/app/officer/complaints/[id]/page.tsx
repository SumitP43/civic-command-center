import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OFFICER_NAV } from '@/types';
import { getCurrentOfficerId } from '@/services/officer-complaint.service';
import { getComplaintById } from '@/services/complaint.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Phone,
  Mail,
  User,
  Shield,
  Camera,
} from 'lucide-react';
import { OfficerStatusActionBar } from '@/components/complaints/officer-status-action-bar';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OfficerComplaintDetailPage({ params }: PageProps) {
  const { id } = await params;
  const officerId = await getCurrentOfficerId();
  const complaint = await getComplaintById(id);

  if (!complaint) {
    notFound();
  }

  const isCritical = complaint.priority_level === 'CRITICAL';
  const isHigh = complaint.priority_level === 'HIGH';
  const isSlaBreached = complaint.sla_breached || (complaint.sla_deadline && new Date(complaint.sla_deadline) < new Date() && complaint.status !== 'RESOLVED');

  return (
    <DashboardShell
      navItems={OFFICER_NAV}
      title="Field Case Workspace"
      subtitle={`Complaint #${complaint.complaint_number}`}
      requiredRole="officer"
    >
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/officer/complaints"
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

        {/* Officer Status Action Workflow Bar */}
        {officerId && (
          <OfficerStatusActionBar
            complaintId={complaint.id}
            officerId={officerId}
            status={complaint.status}
          />
        )}

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Operational Intelligence */}
            {complaint.ai_analysis && (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Field Intelligence
                    </CardTitle>
                    {complaint.ai_confidence && (
                      <Badge variant="outline" className="text-xs">
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Primary Risk</span>
                      <span className="font-semibold text-sm">{complaint.ai_risk || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Severity</span>
                      <span className="font-semibold text-sm text-amber-600">{complaint.severity || 'Normal'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-muted-foreground block text-[11px]">Category</span>
                      <span className="font-semibold text-sm">{complaint.category?.name || 'General'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Citizen Complaint Description */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Citizen Report Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Problem Description
                  </h4>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </div>

                {/* Location */}
                <div className="p-3 bg-muted/30 rounded-lg border flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Incident Location</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {complaint.address || 'Geo-coordinates available on map'}
                    </p>
                    {complaint.landmark && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        Landmark: {complaint.landmark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Media Evidence Carousel */}
                {complaint.media && complaint.media.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      Uploaded Evidence ({complaint.media.length})
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

            {/* Timeline */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Case Activity Timeline
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

          {/* Right Sidebar (1 Col) */}
          <div className="space-y-6">
            {/* SLA & Time Countdown */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  SLA Target & Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className={`p-3 rounded-lg border ${isSlaBreached ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-muted/40'}`}>
                  <span className="block text-[11px] font-medium text-muted-foreground">SLA Deadline</span>
                  <span className="font-bold text-sm">
                    {complaint.sla_deadline ? format(new Date(complaint.sla_deadline), 'dd MMM yyyy, HH:mm') : 'Standard 72h'}
                  </span>
                  {isSlaBreached && (
                    <span className="block text-[10px] text-destructive font-semibold mt-1">
                      ⚠️ Overdue: Resolution required immediately
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1 border-t text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Submitted:</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(complaint.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Affected Citizens:</span>
                    <span className="font-medium text-foreground">{complaint.affected_count || 1} people</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citizen Details */}
            {complaint.citizen && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Citizen Contact
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
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
