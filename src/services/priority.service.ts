import { SLA_CONFIG } from '@/types';
import type { PriorityLevel, SeverityLevel } from '@/types';

export interface PriorityCalculationInput {
  severity: SeverityLevel;
  affectedCount?: number;
  locationRisk?: number; // 0 to 1 scale (e.g. 0.8 for school/hospital/highway zone)
  complaintFrequency?: number; // Count of recent similar complaints in neighborhood (0 to 10+)
  slaUrgency?: number; // 0 to 1 scale (higher as SLA deadline approaches or breaches)
}

/**
 * Base severity values as specified in system design:
 * LOW = 25, MEDIUM = 50, HIGH = 75, CRITICAL = 95
 */
export const BASE_SEVERITY_SCORES: Record<SeverityLevel, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 95,
};

/**
 * Calculate deterministic priority score combining base AI severity with bounded empirical factors.
 * Output is guaranteed to be an integer between 0 and 100.
 */
export function calculatePriorityScore(input: PriorityCalculationInput): number {
  const baseScore = BASE_SEVERITY_SCORES[input.severity] ?? 50;

  // 1. Affected people adjustment: +0 to +15
  const count = Math.max(1, input.affectedCount || 1);
  let affectedAdjustment = 0;
  if (count >= 100) affectedAdjustment = 15;
  else if (count >= 50) affectedAdjustment = 12;
  else if (count >= 20) affectedAdjustment = 8;
  else if (count >= 5) affectedAdjustment = 4;
  else if (count > 1) affectedAdjustment = 2;

  // 2. Location risk adjustment: +0 to +10
  const locRisk = Math.max(0, Math.min(1, input.locationRisk ?? 0));
  const locationAdjustment = Math.round(locRisk * 10);

  // 3. Complaint frequency adjustment: +0 to +10
  const freq = Math.max(0, input.complaintFrequency || 0);
  const frequencyAdjustment = Math.min(10, Math.round(freq * 1.5));

  // 4. SLA urgency adjustment: +0 to +10
  const slaUrg = Math.max(0, Math.min(1, input.slaUrgency ?? 0));
  const slaAdjustment = Math.round(slaUrg * 10);

  // Combine base with bounded adjustments
  const totalScore = baseScore + affectedAdjustment + locationAdjustment + frequencyAdjustment + slaAdjustment;

  // Bound strictly between 0 and 100
  return Math.max(0, Math.min(100, Math.round(totalScore)));
}

/**
 * Derive deterministic priority level from numerical priority score:
 * - 90–100 -> CRITICAL
 * - 75–89  -> HIGH
 * - 50–74  -> MEDIUM
 * - 0–49   -> LOW
 */
export function getPriorityLevel(score: number): PriorityLevel {
  const normalized = Math.max(0, Math.min(100, score));
  if (normalized >= 90) return 'CRITICAL';
  if (normalized >= 75) return 'HIGH';
  if (normalized >= 50) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get SLA deadline based on priority level
 */
export function getSLADeadline(priorityLevel: PriorityLevel, createdAt: Date = new Date()): Date {
  const hours = SLA_CONFIG[priorityLevel]?.hours ?? 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  return new Date() > deadlineDate;
}

/**
 * Get detailed SLA status, remaining time and urgency factor
 */
export function getSLAStatus(deadline: Date | string): {
  breached: boolean;
  remainingHours: number;
  urgencyFactor: number;
  label: string;
} {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const remainingHours = diffMs / (1000 * 60 * 60);

  if (remainingHours <= 0) {
    return {
      breached: true,
      remainingHours: 0,
      urgencyFactor: 1,
      label: 'SLA Breached',
    };
  }

  // Max SLA is 72 hours
  const totalSlaHours = 72;
  const urgencyFactor = Math.min(1, Math.max(0, 1 - remainingHours / totalSlaHours));

  let label: string;
  if (remainingHours < 1) {
    label = `${Math.round(remainingHours * 60)}m remaining`;
  } else if (remainingHours < 24) {
    label = `${Math.round(remainingHours)}h remaining`;
  } else {
    const days = Math.floor(remainingHours / 24);
    const hours = Math.round(remainingHours % 24);
    label = `${days}d ${hours}h remaining`;
  }

  return {
    breached: false,
    remainingHours,
    urgencyFactor,
    label,
  };
}
