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
import { CheckCircle2, Camera, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveComplaint } from '@/services/officer-complaint.service';

interface ResolutionDialogProps {
  complaintId: string;
  officerId: string;
  trigger?: React.ReactNode;
}

export function ResolutionDialog({
  complaintId,
  officerId,
  trigger,
}: ResolutionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  function addUrlField() {
    if (evidenceUrls.length < 5) {
      setEvidenceUrls([...evidenceUrls, '']);
    }
  }

  function removeUrlField(index: number) {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  }

  function handleUrlChange(index: number, val: string) {
    const next = [...evidenceUrls];
    next[index] = val;
    setEvidenceUrls(next);
  }

  async function handleSubmit() {
    if (!notes.trim()) {
      toast.error('Please enter resolution summary and actions taken');
      return;
    }

    const validUrls = evidenceUrls.map((u) => u.trim()).filter(Boolean);

    setLoading(true);
    try {
      const res = await resolveComplaint(complaintId, officerId, notes.trim(), validUrls);
      if (res.success) {
        toast.success('Complaint successfully marked as Resolved!');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to resolve complaint');
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
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer">
            <CheckCircle2 className="h-4 w-4" />
            Mark Resolved
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Complete & Resolve Complaint</DialogTitle>
              <DialogDescription>
                Provide detailed resolution summary and upload proof of work / after-photos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="resNotes">Resolution Summary & Actions Taken *</Label>
            <Textarea
              id="resNotes"
              placeholder="Describe repairs, cleaning, structural fixes, or actions taken to resolve the civic issue..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                Proof of Resolution / After-Photos (URLs)
              </Label>
              {evidenceUrls.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addUrlField}
                  className="h-6 px-2 text-[11px] gap-1 text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Add Photo
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto">
              {evidenceUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="https://example.com/resolved-pothole-proof.jpg"
                    value={url}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    className="text-xs"
                  />
                  {evidenceUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrlField(idx)}
                      className="h-8 w-8 text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!notes.trim() || loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? 'Submitting Resolution...' : 'Submit Resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
