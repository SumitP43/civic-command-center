'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { resolveEscalation, triggerSlaEvaluationCron, type EscalationWithDetails } from '@/services/escalation.service';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface EscalationsTableProps {
  initialEscalations: EscalationWithDetails[];
  departments: { id: string; name: string }[];
}

export function EscalationsTable({
  initialEscalations,
  departments,
}: EscalationsTableProps) {
  const router = useRouter();
  const [escalations, setEscalations] = useState<EscalationWithDetails[]>(initialEscalations);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [isScanning, setIsScanning] = useState(false);

  // Resolve dialog state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter
  const filtered = escalations.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      const matchNum = e.complaint?.complaint_number?.toLowerCase().includes(s);
      const matchTitle = e.complaint?.title?.toLowerCase().includes(s);
      const matchReason = e.reason?.toLowerCase().includes(s);
      if (!matchNum && !matchTitle && !matchReason) return false;
    }

    if (levelFilter !== 'ALL' && e.level !== levelFilter) return false;
    if (priorityFilter !== 'ALL' && e.complaint?.priority_level !== priorityFilter) return false;
    if (statusFilter === 'ACTIVE' && e.is_resolved) return false;
    if (statusFilter === 'RESOLVED' && !e.is_resolved) return false;

    return true;
  });

  async function handleTriggerScan() {
    setIsScanning(true);
    try {
      const res = await triggerSlaEvaluationCron();
      if (res.success) {
        toast.success(`SLA scan completed. Evaluated ${res.evaluatedCount} complaints, created ${res.escalatedCount} new escalations.`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to scan SLA breaches');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsScanning(false);
    }
  }

  async function handleResolve() {
    if (!resolvingId || !resolutionNotes.trim()) {
      toast.error('Please enter resolution notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resolveEscalation(resolvingId, resolutionNotes);
      if (res.success) {
        toast.success('Escalation resolved successfully');
        setEscalations((prev) =>
          prev.map((e) =>
            e.id === resolvingId
              ? { ...e, is_resolved: true, resolution_notes: resolutionNotes, resolved_at: new Date().toISOString() }
              : e
          )
        );
        setResolvingId(null);
        setResolutionNotes('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to resolve escalation');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search complaint #, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={(val) => setLevelFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 w-36 text-xs bg-background">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="department_admin">Dept Admin (L1)</SelectItem>
              <SelectItem value="super_admin">Super Admin (L2)</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 w-36 text-xs bg-background">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ACTIVE')}>
            <SelectTrigger className="h-9 w-32 text-xs bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              <SelectItem value="ACTIVE">Active (Pending)</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger SLA Evaluation Cron Button */}
        <Button
          onClick={handleTriggerScan}
          disabled={isScanning}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs shrink-0 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Evaluating SLA...' : 'Run SLA Scan'}</span>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-32 font-semibold">Complaint #</TableHead>
              <TableHead className="w-32 font-semibold">Escalation Level</TableHead>
              <TableHead className="font-semibold">Reason & Incident</TableHead>
              <TableHead className="font-semibold">Department & Officer</TableHead>
              <TableHead className="font-semibold">SLA Deadline</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-28 text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                  No escalations found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const c = e.complaint;
                const isSuperAdminLevel = e.level === 'super_admin';
                const isCritical = c?.priority_level === 'CRITICAL';
                const activeAssignment = c?.assignments?.find((a: any) => a.is_active);

                return (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                    {/* Complaint Number */}
                    <TableCell className="font-mono font-bold text-xs text-primary">
                      {c ? (
                        <Link href={`/department/complaints/${c.id}`} className="hover:underline">
                          {c.complaint_number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    {/* Level */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          isSuperAdminLevel
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {isSuperAdminLevel ? 'Level 2 (City Admin)' : 'Level 1 (Dept Admin)'}
                      </Badge>
                    </TableCell>

                    {/* Reason & Title */}
                    <TableCell className="max-w-xs">
                      <div className="font-medium text-xs text-destructive">{e.reason}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {c?.title || 'Civic Case'}
                      </div>
                    </TableCell>

                    {/* Department & Officer */}
                    <TableCell className="text-xs">
                      <span className="font-medium block">{c?.department?.name || 'General'}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {activeAssignment?.officer?.profile?.full_name || 'Unassigned'}
                      </span>
                    </TableCell>

                    {/* SLA Deadline */}
                    <TableCell className="text-xs">
                      {c?.sla_deadline ? (
                        <div className="text-destructive font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{format(new Date(c.sla_deadline), 'dd MMM, HH:mm')}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {e.is_resolved ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Active Breach
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      {!e.is_resolved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setResolvingId(e.id);
                            setResolutionNotes('');
                          }}
                          className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={!!resolvingId} onOpenChange={(open) => !open && setResolvingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve SLA Escalation</DialogTitle>
            <DialogDescription>
              Record administrative resolution action and mitigation notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Detail the remedial actions taken (e.g. dispatched emergency backup crew, expedited parts)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResolvingId(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
