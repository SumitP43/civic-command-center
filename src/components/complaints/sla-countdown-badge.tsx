'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { calculateRemainingTime, getSlaStatus, type SlaStatus } from '@/lib/sla-utils';
import type { ComplaintStatus } from '@/types';

interface SlaCountdownBadgeProps {
  deadline: string | Date | null | undefined;
  status: ComplaintStatus | string;
  slaBreached?: boolean;
  createdAt?: string | Date | null;
  showIcon?: boolean;
  className?: string;
}

export function SlaCountdownBadge({
  deadline,
  status,
  slaBreached,
  createdAt,
  showIcon = true,
  className = '',
}: SlaCountdownBadgeProps) {
  const [time, setTime] = useState(() => calculateRemainingTime(deadline));
  const [slaState, setSlaState] = useState<SlaStatus>(() =>
    getSlaStatus(deadline, status, slaBreached, createdAt)
  );

  useEffect(() => {
    if (status === 'RESOLVED' || status === 'CLOSED' || !deadline) {
      return;
    }

    const interval = setInterval(() => {
      const updatedTime = calculateRemainingTime(deadline);
      setTime(updatedTime);
      setSlaState(getSlaStatus(deadline, status, slaBreached, createdAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, status, slaBreached, createdAt]);

  if (status === 'RESOLVED' || status === 'CLOSED') {
    return (
      <Badge
        variant="outline"
        className={`bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] gap-1 font-medium ${className}`}
      >
        {showIcon && <CheckCircle2 className="h-3 w-3" />}
        <span>SLA Met</span>
      </Badge>
    );
  }

  if (!deadline) {
    return (
      <Badge variant="outline" className={`text-muted-foreground text-[11px] ${className}`}>
        No SLA Set
      </Badge>
    );
  }

  if (slaState === 'breached' || time.isBreached) {
    return (
      <Badge
        variant="outline"
        className={`bg-destructive/10 text-destructive border-destructive/30 text-[11px] gap-1 font-semibold animate-pulse ${className}`}
      >
        {showIcon && <ShieldAlert className="h-3 w-3" />}
        <span>{time.formatted}</span>
      </Badge>
    );
  }

  if (slaState === 'approaching') {
    return (
      <Badge
        variant="outline"
        className={`bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] gap-1 font-semibold ${className}`}
      >
        {showIcon && <AlertTriangle className="h-3 w-3" />}
        <span>{time.formatted}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-primary/5 text-primary border-primary/20 text-[11px] gap-1 font-medium ${className}`}
    >
      {showIcon && <Clock className="h-3 w-3" />}
      <span>{time.formatted} remaining</span>
    </Badge>
  );
}
