'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, CheckCircle2, RefreshCw, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { submitCitizenFeedback } from '@/services/complaint.service';

interface CitizenVerificationCardProps {
  complaintId: string;
  existingFeedback?: {
    rating: number;
    comment: string | null;
    is_resolution_accepted: boolean;
    created_at: string;
  } | null;
}

export function CitizenVerificationCard({
  complaintId,
  existingFeedback,
}: CitizenVerificationCardProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || '');
  const [isAccepted, setIsAccepted] = useState<boolean>(
    existingFeedback ? existingFeedback.is_resolution_accepted : true
  );
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  if (existingFeedback) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Citizen Verification Recorded
            </CardTitle>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= existingFeedback.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
          <CardDescription>
            {existingFeedback.is_resolution_accepted
              ? 'You confirmed that the issue was resolved successfully.'
              : 'You requested the issue to be reopened.'}
          </CardDescription>
        </CardHeader>
        {existingFeedback.comment && (
          <CardContent className="text-xs text-muted-foreground italic border-t border-border/40 pt-3">
            &ldquo;{existingFeedback.comment}&rdquo;
          </CardContent>
        )}
      </Card>
    );
  }

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const res = await submitCitizenFeedback({
          complaint_id: complaintId,
          rating,
          comment: comment || undefined,
          is_resolution_accepted: isAccepted,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(
            isAccepted
              ? 'Thank you! Resolution verified and ticket closed.'
              : 'Ticket marked as reopened. Department notified.'
          );
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit verification');
      }
    });
  };

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Verify Issue Resolution
        </CardTitle>
        <CardDescription>
          The field officer has marked this issue as resolved. Please verify if the work was completed to your satisfaction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Accept / Reject Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={isAccepted ? 'default' : 'outline'}
            className={`gap-2 h-11 ${
              isAccepted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'hover:border-emerald-500 hover:text-emerald-600'
            }`}
            onClick={() => setIsAccepted(true)}
          >
            <ThumbsUp className="w-4 h-4" />
            Yes, Issue is Resolved
          </Button>

          <Button
            type="button"
            variant={!isAccepted ? 'destructive' : 'outline'}
            className="gap-2 h-11"
            onClick={() => setIsAccepted(false)}
          >
            <ThumbsDown className="w-4 h-4" />
            No, Reopen Ticket
          </Button>
        </div>

        {/* Star Rating */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs">Rate the Resolution Quality</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30 hover:text-amber-300'
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-semibold text-muted-foreground ml-2">
              {rating}/5 {rating >= 4 ? '⭐️ Satisfied' : rating === 3 ? 'Neutral' : 'Needs Improvement'}
            </span>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="feedback-comment" className="text-xs">
            {isAccepted ? 'Comments / Feedback (Optional)' : 'Reason for reopening *'}
          </Label>
          <Textarea
            id="feedback-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isAccepted
                ? 'Great job, streetlights are functioning properly now...'
                : 'The pothole was only partially filled and still dangerous...'
            }
            disabled={isPending}
          />
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/40 flex justify-end">
        <Button
          type="button"
          disabled={isPending || (!isAccepted && !comment.trim())}
          onClick={handleSubmit}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting Feedback...
            </>
          ) : (
            <>
              {isAccepted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Close Ticket
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Submit & Reopen Issue
                </>
              )}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
