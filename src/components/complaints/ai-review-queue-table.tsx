'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { AlertTriangle, RefreshCw, Edit3, CheckCircle2, Flame } from 'lucide-react';
import { AiManualReviewDialog } from './ai-manual-review-dialog';
import { retryComplaintAI } from '@/services/ai-complaint.service';
import { toast } from 'sonner';
import { PRIORITY_RANGES, AI_PROCESSING_CONFIG } from '@/types';
import type { ComplaintWithRelations, Department, ComplaintCategory } from '@/types';

interface AiReviewQueueTableProps {
  initialComplaints: ComplaintWithRelations[];
  departments: Department[];
  categories: ComplaintCategory[];
  isAdmin?: boolean;
}

export function AiReviewQueueTable({
  initialComplaints,
  departments,
  categories,
  isAdmin = true,
}: AiReviewQueueTableProps) {
  const [complaints, setComplaints] = useState<ComplaintWithRelations[]>(initialComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithRelations | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function handleRetry(complaintId: string) {
    setRetryingId(complaintId);
    try {
      const res = await retryComplaintAI(complaintId);
      if (res.success) {
        toast.success('AI re-analysis completed successfully.');
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === complaintId
              ? {
                  ...c,
                  ai_processing_status: res.processingStatus,
                  requires_manual_review: res.requiresManualReview,
                  severity: res.analysis?.severity || c.severity,
                  priority_score: res.analysis?.priorityScore ?? c.priority_score,
                  priority_level: res.analysis?.priorityLevel || c.priority_level,
                  ai_summary: res.analysis?.summary || c.ai_summary,
                  ai_confidence: res.analysis?.confidence ?? c.ai_confidence,
                }
              : c
          )
        );
      } else {
        toast.error(res.error || 'Retry failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error retrying AI analysis';
      toast.error(msg);
    } finally {
      setRetryingId(null);
    }
  }

  function handleOpenReview(complaint: ComplaintWithRelations) {
    setSelectedComplaint(complaint);
    setReviewDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Complaint #</TableHead>
              <TableHead>Title & Summary</TableHead>
              <TableHead>AI Status</TableHead>
              <TableHead>Priority / Severity</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  All complaints are fully AI-analyzed and verified. No items in manual review queue.
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((c) => {
                const confPercent =
                  c.ai_confidence !== null && c.ai_confidence !== undefined
                    ? Math.round(c.ai_confidence * 100)
                    : null;
                const statusCfg = AI_PROCESSING_CONFIG[c.ai_processing_status || 'pending'] || AI_PROCESSING_CONFIG.pending;
                const priorityConfig = c.priority_level ? PRIORITY_RANGES[c.priority_level] : PRIORITY_RANGES.MEDIUM;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      <Link
                        href={isAdmin ? `/admin/complaints/${c.id}` : `/department/complaints/${c.id}`}
                        className="hover:underline text-primary"
                      >
                        {c.complaint_number}
                      </Link>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      {c.ai_summary ? (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          &ldquo;{c.ai_summary}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      {c.requires_manual_review ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review Required
                        </Badge>
                      ) : (
                        <Badge variant={statusCfg.badgeVariant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5" style={{ color: priorityConfig.color }} />
                        <span className="text-xs font-bold" style={{ color: priorityConfig.color }}>
                          {c.priority_score ?? 0}
                        </span>
                        <span className="text-[11px] text-muted-foreground">({c.severity || 'MED'})</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {confPercent !== null ? (
                        <span
                          className={`text-xs font-semibold ${
                            confPercent >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : confPercent >= 70
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {confPercent}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium">
                      {c.department?.name ? (
                        <span>{c.department.code}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRetry(c.id)}
                          disabled={retryingId === c.id}
                          title="Retry AI Analysis"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${retryingId === c.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleOpenReview(c)}
                        >
                          <Edit3 className="h-3 w-3" />
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedComplaint && (
        <AiManualReviewDialog
          complaint={selectedComplaint}
          departments={departments}
          categories={categories}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onSuccess={() => {
            setComplaints((prev) => prev.filter((c) => c.id !== selectedComplaint.id));
          }}
        />
      )}
    </div>
  );
}
