import type { ComplaintStatus, PriorityLevel } from '@/types';
import { SLA_CONFIG } from '@/types';

export type SlaStatus = 'healthy' | 'approaching' | 'breached' | 'completed';

export interface SlaTimeRemaining {
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
  isBreached: boolean;
  totalMs: number;
}

/**
 * Determine the SLA status of a complaint
 * - 'completed': Complaint is resolved or closed
 * - 'breached': Deadline has passed and not resolved
 * - 'approaching': Within 20% of total SLA duration or < 12 hours remaining
 * - 'healthy': Well within SLA duration
 */
export function getSlaStatus(
  deadline: string | Date | null | undefined,
  status: ComplaintStatus | string,
  slaBreached?: boolean,
  createdAt?: string | Date | null
): SlaStatus {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'completed';
  }

  if (slaBreached) {
    return 'breached';
  }

  if (!deadline) {
    return 'healthy';
  }

  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();

  if (now > deadlineTime) {
    return 'breached';
  }

  const remainingMs = deadlineTime - now;

  // Calculate approaching threshold
  // If created_at is provided, approaching is when <= 20% of total window remains
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    const totalDuration = Math.max(1, deadlineTime - createdTime);
    if (remainingMs / totalDuration <= 0.20) {
      return 'approaching';
    }
  }

  // Fallback: Less than 12 hours (or less than 1h for critical) is approaching
  if (remainingMs <= 12 * 60 * 60 * 1000) {
    return 'approaching';
  }

  return 'healthy';
}

/**
 * Calculate precise time remaining or overdue duration
 */
export function calculateRemainingTime(
  deadline: string | Date | null | undefined
): SlaTimeRemaining {
  if (!deadline) {
    return {
      formatted: '—',
      hours: 0,
      minutes: 0,
      seconds: 0,
      isBreached: false,
      totalMs: 0,
    };
  }

  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const diff = target - now;
  const isBreached = diff < 0;
  const absDiff = Math.abs(diff);
  const totalSeconds = Math.round(absDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = isBreached
    ? `Overdue by ${pad(hours)}h ${pad(minutes)}m`
    : `${pad(hours)}h ${pad(minutes)}m`;

  return {
    formatted,
    hours,
    minutes,
    seconds,
    isBreached,
    totalMs: diff,
  };
}

/**
 * Calculates percentage of SLA consumed (0 - 100)
 */
export function getSlaProgressPercent(
  createdAt: string | Date,
  deadline: string | Date | null | undefined,
  resolvedAt?: string | Date | null
): number {
  if (!deadline) return 0;

  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const current = resolvedAt ? new Date(resolvedAt).getTime() : new Date().getTime();

  const total = end - start;
  if (total <= 0) return 100;

  const elapsed = current - start;
  const percent = Math.round((elapsed / total) * 100);

  return Math.min(100, Math.max(0, percent));
}
