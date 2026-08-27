import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CITIZEN_NAV, STATUS_CONFIG, PRIORITY_RANGES } from '@/types';
import { getComplaintById } from '@/services/complaint.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Building2,
  User,
  Shield,
  Camera,
  Activity,
  UserCheck,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CitizenVerificationCard } from '@/components/complaints/citizen-verification-card';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CitizenComplaintDetailPage({ params }: PageProps) {
  const { id } = await params;
  const complaint = await getComplaintById(id);

  if (!complaint) {
    notFound();
  }

  const statusConf = STATUS_CONFIG[complaint.status] || {
    label: complaint.status,
    color: '#6B7280',
    bgColor: '#F3F4F6',
  };

  const priorityConf =
    PRIORITY_RANGES[complaint.priority_level as keyof typeof PRIORITY_RANGES] || PRIORITY_RANGES.LOW;

  const isResolvedOrVerification =
    complaint.status === 'RESOLVED' ||
    complaint.status === 'CITIZEN_VERIFICATION' ||
    complaint.status === 'CLOSED';

  const existingFeedback = Array.isArray(complaint.feedback) && complaint.feedback.length > 0
    ? complaint.feedback[0]
    : null;

  return (
    <DashboardShell
      navItems={CITIZEN_NAV}
      title="Complaint Tracking"
      subtitle={`Ticket #${complaint.complaint_number}`}
      requiredRole="citizen"
    >
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/citizen/dashboard"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">
                  {complaint.complaint_number}
                </span>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                >
                  {statusConf.label}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                {complaint.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge
              variant="outline"
              className="text-xs uppercase font-bold"
              style={{ borderColor: priorityConf.color, color: priorityConf.color }}
            >
              {complaint.priority_level} PRIORITY ({complaint.priority_score}/100)
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Details (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Overview */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Issue Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {complaint.description}
                </p>

                {/* Metadata badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> Department
                    </span>
                    <p className="font-semibold text-foreground truncate">
                      {complaint.department?.name || 'Automated Routing'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Category
                    </span>
                    <p className="font-semibold text-foreground truncate">
                      {complaint.category?.name || 'Civic Infrastructure'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Submitted
                    </span>
                    <p className="font-semibold text-foreground">
                      {format(new Date(complaint.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Address */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Incident Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                  <p className="font-medium text-foreground">{complaint.address}</p>
                  {complaint.landmark && (
                    <p className="text-muted-foreground">Landmark: {complaint.landmark}</p>
                  )}
                  {(complaint as any).latitude && (complaint as any).longitude && (
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Coordinates: {Number((complaint as any).latitude).toFixed(5)}, {Number((complaint as any).longitude).toFixed(5)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Evidence Photos */}
            {complaint.media && complaint.media.length > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Attached Evidence Photos ({complaint.media.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {complaint.media.map((m) => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative rounded-xl overflow-hidden aspect-video border border-border bg-muted block hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={m.url}
                          alt="Complaint evidence"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verification Section if Resolved */}
            {isResolvedOrVerification && (
              <CitizenVerificationCard
                complaintId={complaint.id}
                existingFeedback={existingFeedback as any}
              />
            )}
          </div>

          {/* Right Column: Live Timeline & SLA Radar */}
          <div className="space-y-6">
            {/* Live Progress Timeline */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Resolution Timeline
                </CardTitle>
                <CardDescription>Live real-time updates from the field dispatch team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {complaint.updates && complaint.updates.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {complaint.updates
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      )
                      .map((u, idx) => {
                        const isLatest = idx === 0;
                        const updateConf = STATUS_CONFIG[u.new_status] || {
                          label: u.new_status,
                          color: '#6B7280',
                        };

                        return (
                          <div key={u.id} className="relative space-y-1">
                            <span
                              className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-background ${
                                isLatest ? 'bg-primary animate-ping' : 'bg-muted-foreground'
                              }`}
                            />
                            <span
                              className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-background ${
                                isLatest ? 'bg-primary' : 'bg-muted-foreground'
                              }`}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">
                                {updateConf.label}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {u.notes && (
                              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40">
                                {u.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Initial status logged. Waiting for officer dispatch.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Intelligence Card */}
            {complaint.ai_analysis && (
              <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Intelligence Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">AI Category:</span>
                    <span className="font-semibold text-foreground">{complaint.ai_analysis.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Severity Level:</span>
                    <span className="font-semibold text-primary">{complaint.ai_analysis.severity}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Confidence Score:</span>
                    <span className="font-semibold text-foreground">
                      {Math.round((complaint.ai_analysis.confidence_score || 0.9) * 100)}%
                    </span>
                  </div>
                  {complaint.ai_analysis.summary && (
                    <p className="pt-2 text-[11px] text-muted-foreground italic">
                      &ldquo;{complaint.ai_analysis.summary}&rdquo;
                    </p>
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
