'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { manualCorrectionSchema, type ManualCorrectionData } from '@/lib/validators/ai';
import { manualReviewAIClassification } from '@/services/ai-complaint.service';
import type { ComplaintWithRelations, Department, ComplaintCategory, SeverityLevel } from '@/types';

interface AiManualReviewDialogProps {
  complaint: ComplaintWithRelations;
  departments: Department[];
  categories: ComplaintCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AiManualReviewDialog({
  complaint,
  departments,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: AiManualReviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ManualCorrectionData>({
    resolver: zodResolver(manualCorrectionSchema),
    defaultValues: {
      complaintId: complaint.id,
      departmentId: complaint.department_id || undefined,
      categoryId: complaint.category_id || undefined,
      severity: complaint.severity || 'MEDIUM',
      priorityScore: complaint.priority_score ?? 50,
      notes: '',
    },
  });

  const selectedSeverity = form.watch('severity');

  async function onSubmit(data: ManualCorrectionData) {
    setLoading(true);
    try {
      const res = await manualReviewAIClassification(data);
      if (res.success) {
        toast.success('AI classification updated and verified successfully.');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || 'Failed to update classification.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting review';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Manual AI Classification Review</DialogTitle>
          <DialogDescription>
            Review and adjust AI-assigned routing, severity, and priority for Complaint #{complaint.complaint_number}. Original AI predictions will be preserved in the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Department Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Assigned Department</Label>
            <Select
              defaultValue={complaint.department_id || undefined}
              onValueChange={(val) => form.setValue('departmentId', val || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Issue Category</Label>
            <Select
              defaultValue={complaint.category_id || undefined}
              onValueChange={(val) => form.setValue('categoryId', val || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="severity">Severity Level</Label>
              <Select
                defaultValue={selectedSeverity}
                onValueChange={(val) => form.setValue('severity', val as SeverityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priorityScore">Priority Score (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                {...form.register('priorityScore', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Review Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Administrator Review Notes</Label>
            <Textarea
              placeholder="Reason for manual adjustment or verification notes..."
              rows={3}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Confirm & Approve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
