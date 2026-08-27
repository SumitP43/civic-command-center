'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, Sparkles, MapPin, Gauge, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  getRecommendedOfficers,
  assignOfficerToComplaint,
  reassignComplaint,
  type OfficerRecommendation,
} from '@/services/assignment.service';
import { OfficerWorkloadBar } from './officer-workload-bar';
import { getInitials } from '@/lib/utils';

interface OfficerAssignDialogProps {
  complaintId: string;
  departmentId?: string;
  currentOfficerId?: string;
  isReassign?: boolean;
  trigger?: React.ReactNode;
}

export function OfficerAssignDialog({
  complaintId,
  departmentId,
  currentOfficerId,
  isReassign = false,
  trigger,
}: OfficerAssignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState<OfficerRecommendation[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      loadRecommendations();
    }
  }, [open, complaintId, departmentId]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const list = await getRecommendedOfficers(complaintId, departmentId);
      setRecommendations(list);
      // Auto select top recommended if available
      const topValid = list.find((r) => r.canAssign && r.officer.id !== currentOfficerId);
      if (topValid) {
        setSelectedOfficerId(topValid.officer.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load recommended officers');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedOfficerId) {
      toast.error('Please select an officer to assign');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isReassign) {
        res = await reassignComplaint(complaintId, selectedOfficerId, notes || 'Reassigned by department admin');
      } else {
        res = await assignOfficerToComplaint(complaintId, selectedOfficerId, notes);
      }

      if (res.success) {
        toast.success(isReassign ? 'Officer reassigned successfully' : 'Officer assigned successfully');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to complete assignment');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger || (
          <Button size="sm" className="gap-1.5 shadow-sm cursor-pointer">
            <UserCheck className="h-4 w-4" />
            {isReassign ? 'Reassign Officer' : 'Assign Officer'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isReassign ? 'Reassign Complaint Officer' : 'Smart Officer Assignment'}</DialogTitle>
              <DialogDescription>
                AI-matched field officers ranked by availability, proximity, workload, and specialization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            <span>Calculating optimal officer recommendations...</span>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center bg-muted/40 rounded-lg border border-dashed p-6">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-sm">No Active Department Officers Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please register or activate officers in this department first.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recommended Field Officers
            </Label>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {recommendations.map((item, idx) => {
                const isSelected = selectedOfficerId === item.officer.id;
                const isCurrent = currentOfficerId === item.officer.id;

                return (
                  <div
                    key={item.officer.id}
                    onClick={() => item.canAssign && setSelectedOfficerId(item.officer.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : item.canAssign
                        ? 'border-border hover:border-primary/40 hover:bg-muted/30'
                        : 'border-border/50 bg-muted/20 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={item.officer.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(item.officer.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {item.officer.profile?.full_name || 'Officer'}
                            </span>
                            {idx === 0 && item.canAssign && (
                              <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] py-0 h-4">
                                Top Match
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                Currently Assigned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Badge: {item.officer.badge_number || 'N/A'}</span>
                            <span>•</span>
                            <span>{item.officer.designation || 'Field Officer'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Gauge className="h-3.5 w-3.5 text-primary" />
                          <span className="text-base font-bold text-foreground">
                            {item.score}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/100</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Match Score
                        </span>
                      </div>
                    </div>

                    {/* Breakdown & Workload */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <OfficerWorkloadBar
                        active={item.officer.active_complaints}
                        max={item.officer.max_complaints}
                        showBadge={false}
                      />

                      <div className="flex items-center gap-3 justify-end text-muted-foreground text-[11px]">
                        {item.distanceKm != null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {item.distanceKm} km
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-emerald-500" />
                          Skill: {item.skillScore}/25
                        </span>
                      </div>
                    </div>

                    {/* Reasons */}
                    {item.reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.reasons.map((r, i) => (
                          <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Assignment Notes */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="notes" className="text-xs">
                Assignment Instructions / Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add special instructions, priority notes, or dispatch directives for the officer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedOfficerId || submitting || loading}
            className="gap-1.5"
          >
            {submitting ? 'Assigning...' : isReassign ? 'Confirm Reassignment' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
