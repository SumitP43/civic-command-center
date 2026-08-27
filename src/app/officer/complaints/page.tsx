import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OFFICER_NAV } from '@/types';
import { getCurrentOfficerId, getOfficerComplaints } from '@/services/officer-complaint.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, MapPin, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function OfficerComplaintsPage() {
  const officerId = await getCurrentOfficerId();
  const complaints = officerId ? await getOfficerComplaints(officerId) : [];

  return (
    <DashboardShell
      navItems={OFFICER_NAV}
      title="My Assigned Complaints"
      subtitle="Field Execution Queue"
      requiredRole="officer"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Assigned Civic Cases</h2>
            <p className="text-xs text-muted-foreground">
              Review assigned complaints, initiate work, update progress, and upload resolution proof.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {complaints.length} Total Cases
          </Badge>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-32 font-semibold">Complaint #</TableHead>
                <TableHead className="font-semibold">Issue & Category</TableHead>
                <TableHead className="w-28 font-semibold">Priority</TableHead>
                <TableHead className="w-28 font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">SLA Deadline</TableHead>
                <TableHead className="w-28 text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                    No assigned complaints currently in your queue.
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((c) => {
                  const isCritical = c.priority_level === 'CRITICAL';
                  const isHigh = c.priority_level === 'HIGH';
                  const isSlaBreached = c.sla_breached || (c.sla_deadline && new Date(c.sla_deadline) < new Date() && c.status !== 'RESOLVED');

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        <Link href={`/officer/complaints/${c.id}`} className="hover:underline">
                          {c.complaint_number}
                        </Link>
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-sm line-clamp-1">{c.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{c.category?.name || 'General'}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        </div>
                      </TableCell>

                      <TableCell>
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
                          {c.priority_level} ({c.priority_score})
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {c.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {c.address || 'Location on file'}
                      </TableCell>

                      <TableCell>
                        {c.sla_deadline ? (
                          <div className={`text-xs ${isSlaBreached ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            <div className="flex items-center gap-1">
                              {isSlaBreached ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              <span>{format(new Date(c.sla_deadline), 'dd MMM, HH:mm')}</span>
                            </div>
                            {isSlaBreached && (
                              <span className="text-[10px] text-destructive">Overdue</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link
                          href={`/officer/complaints/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardShell>
  );
}
