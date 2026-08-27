'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Play,
  MessageSquarePlus,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { acceptComplaint, startWorkOnComplaint } from '@/services/officer-complaint.service';
import { ProgressUpdateDialog } from './progress-update-dialog';
import { ResolutionDialog } from './resolution-dialog';
import type { ComplaintStatus } from '@/types';

interface OfficerStatusActionBarProps {
  complaintId: string;
  officerId: string;
  status: ComplaintStatus;
}

export function OfficerStatusActionBar({
  complaintId,
  officerId,
  status,
}: OfficerStatusActionBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await acceptComplaint(complaintId, officerId);
      if (res.success) {
        toast.success('Complaint accepted! You are now the active field officer.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to accept complaint');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWork() {
    setLoading(true);
    try {
      const res = await startWorkOnComplaint(complaintId, officerId);
      if (res.success) {
        toast.success('Work marked as IN PROGRESS. Inspection crew active.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to start work');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Current Workflow State
            </span>
            <Badge variant="secondary" className="font-semibold text-xs">
              {status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === 'ASSIGNED' && 'Awaiting your acceptance to confirm jurisdiction and deployment.'}
            {status === 'ACCEPTED' && 'Accepted. Click Start Work when dispatching to the site.'}
            {status === 'IN_PROGRESS' && 'Active field work underway. Post updates or mark resolved.'}
            {status === 'RESOLVED' && 'Field resolution completed. Awaiting citizen verification.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {status === 'ASSIGNED' && (
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="gap-1.5 shadow-sm bg-primary"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? 'Accepting...' : 'Accept Complaint'}
          </Button>
        )}

        {status === 'ACCEPTED' && (
          <Button
            onClick={handleStartWork}
            disabled={loading}
            className="gap-1.5 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Play className="h-4 w-4 fill-white" />
            {loading ? 'Starting...' : 'Start Work On Site'}
          </Button>
        )}

        {status === 'IN_PROGRESS' && (
          <>
            <ProgressUpdateDialog
              complaintId={complaintId}
              officerId={officerId}
            />
            <ResolutionDialog
              complaintId={complaintId}
              officerId={officerId}
            />
          </>
        )}

        {status === 'RESOLVED' && (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Resolved by Field Officer
          </Badge>
        )}
      </div>
    </div>
  );
}
