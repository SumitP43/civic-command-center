'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { changeComplaintDepartment } from '@/services/assignment.service';
import type { Department } from '@/types';

interface ChangeDepartmentDialogProps {
  complaintId: string;
  currentDepartmentId?: string | null;
  departments: Department[];
  trigger?: React.ReactNode;
}

export function ChangeDepartmentDialog({
  complaintId,
  currentDepartmentId,
  departments,
  trigger,
}: ChangeDepartmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selectedDeptId) {
      toast.error('Please select the target department');
      return;
    }

    if (selectedDeptId === currentDepartmentId) {
      toast.error('Selected department is already the current department');
      return;
    }

    setLoading(true);
    try {
      const res = await changeComplaintDepartment(complaintId, selectedDeptId, notes);
      if (res.success) {
        toast.success('Complaint re-routed to new department');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to change department');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            <ArrowRightLeft className="h-4 w-4" />
            Change Department
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Re-Route Department</DialogTitle>
              <DialogDescription>
                Transfer this complaint to a different specialized civic department.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="deptSelect">Target Department</Label>
            <Select
              defaultValue={undefined}
              onValueChange={(val) => setSelectedDeptId(val || undefined)}
            >
              <SelectTrigger id="deptSelect">
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => d.id !== currentDepartmentId)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Reason for Transfer / Re-routing</Label>
            <Textarea
              id="notes"
              placeholder="Explain why this complaint belongs to the selected department..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDeptId || loading}
            className="gap-1.5"
          >
            {loading ? 'Transferring...' : 'Transfer Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
