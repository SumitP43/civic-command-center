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
import { Input } from '@/components/ui/input';
import { MessageSquarePlus, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { addComplaintProgressUpdate } from '@/services/officer-complaint.service';

interface ProgressUpdateDialogProps {
  complaintId: string;
  officerId: string;
  trigger?: React.ReactNode;
}

export function ProgressUpdateDialog({
  complaintId,
  officerId,
  trigger,
}: ProgressUpdateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!notes.trim()) {
      toast.error('Please enter progress notes');
      return;
    }

    setLoading(true);
    try {
      const res = await addComplaintProgressUpdate(
        complaintId,
        officerId,
        notes.trim(),
        mediaUrl.trim() || undefined
      );

      if (res.success) {
        toast.success('Progress update recorded to timeline');
        setNotes('');
        setMediaUrl('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to post update');
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
            <MessageSquarePlus className="h-4 w-4" />
            Add Progress Update
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Post Field Progress Update</DialogTitle>
              <DialogDescription>
                Record live updates, inspection findings, or equipment dispatch status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="progressNotes">Progress Details / Inspection Notes</Label>
            <Textarea
              id="progressNotes"
              placeholder="E.g. Field inspection completed. Repair crew dispatched with heavy machinery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mediaUrl" className="flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              Optional Progress Photo URL
            </Label>
            <Input
              id="mediaUrl"
              placeholder="https://example.com/field-photo.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!notes.trim() || loading}>
            {loading ? 'Posting...' : 'Post Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
