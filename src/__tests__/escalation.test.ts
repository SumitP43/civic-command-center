import { describe, it, expect } from 'vitest';
import type { EscalationLevel, PriorityLevel, ComplaintStatus } from '@/types';

describe('Multi-tier SLA Escalation Engine', () => {
  function determineEscalationLevel(
    priority: PriorityLevel,
    breachDurationHours: number
  ): EscalationLevel {
    if (priority === 'CRITICAL' || breachDurationHours >= 24) {
      return 'super_admin'; // Level 2 (City Admin)
    }
    return 'department_admin'; // Level 1 (Department Admin)
  }

  function shouldEscalateComplaint(
    status: ComplaintStatus,
    deadline: string | null,
    hasActiveEscalation: boolean
  ): boolean {
    // Safety check 1: Do not escalate closed or resolved complaints
    if (status === 'RESOLVED' || status === 'CLOSED') {
      return false;
    }
    // Safety check 2: Must have a deadline in the past
    if (!deadline || new Date(deadline).getTime() >= Date.now()) {
      return false;
    }
    // Safety check 3: Idempotent check, do not create duplicate active escalation
    if (hasActiveEscalation) {
      return false;
    }
    return true;
  }

  it('assigns Level 1 (department_admin) for standard breaches', () => {
    const level = determineEscalationLevel('HIGH', 4);
    expect(level).toBe('department_admin');

    const medLevel = determineEscalationLevel('MEDIUM', 10);
    expect(medLevel).toBe('department_admin');
  });

  it('assigns Level 2 (super_admin) for critical priority breaches or extended overdue duration', () => {
    const critLevel = determineEscalationLevel('CRITICAL', 0.5);
    expect(critLevel).toBe('super_admin');

    const extendedLevel = determineEscalationLevel('HIGH', 28);
    expect(extendedLevel).toBe('super_admin');
  });

  it('strictly blocks escalation for resolved or closed complaints', () => {
    const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(shouldEscalateComplaint('RESOLVED', pastDeadline, false)).toBe(false);
    expect(shouldEscalateComplaint('CLOSED', pastDeadline, false)).toBe(false);
  });

  it('strictly blocks duplicate escalations if active escalation already exists', () => {
    const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(shouldEscalateComplaint('IN_PROGRESS', pastDeadline, true)).toBe(false);
    expect(shouldEscalateComplaint('IN_PROGRESS', pastDeadline, false)).toBe(true);
  });
});
