'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface OfficerWorkloadBarProps {
  active: number;
  max: number;
  showBadge?: boolean;
}

export function OfficerWorkloadBar({
  active = 0,
  max = 10,
  showBadge = true,
}: OfficerWorkloadBarProps) {
  const percentage = Math.min(100, Math.round((active / Math.max(1, max)) * 100));

  const getColorClass = () => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (percentage >= 100) return 'At Capacity';
    if (percentage >= 70) return 'High Load';
    return 'Available';
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Workload: {active}/{max}
        </span>
        {showBadge && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-4 border-0 font-medium ${
              percentage >= 100
                ? 'bg-destructive/10 text-destructive'
                : percentage >= 70
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {getStatusText()} ({percentage}%)
          </Badge>
        )}
      </div>
      <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
        <div
          className={`h-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
