import { describe, it, expect } from 'vitest';
import {
  getSlaStatus,
  calculateRemainingTime,
  getSlaProgressPercent,
} from '@/lib/sla-utils';

describe('SLA Engine & Calculation Utilities', () => {
  const now = new Date();

  it('marks resolved and closed complaints as completed', () => {
    expect(getSlaStatus(new Date(now.getTime() - 3600 * 1000), 'RESOLVED')).toBe('completed');
    expect(getSlaStatus(new Date(now.getTime() - 3600 * 1000), 'CLOSED')).toBe('completed');
  });

  it('marks complaints as breached when deadline is past or slaBreached is true', () => {
    const pastDeadline = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    expect(getSlaStatus(pastDeadline, 'IN_PROGRESS')).toBe('breached');
    expect(getSlaStatus(new Date(now.getTime() + 10 * 3600 * 1000), 'IN_PROGRESS', true)).toBe('breached');
  });

  it('marks complaints as approaching when within 20% of total duration or under 12 hours', () => {
    // 5 hours remaining out of 24 hours (20.8% ~ under 12h threshold)
    const upcomingDeadline = new Date(now.getTime() + 5 * 3600 * 1000).toISOString();
    const createdTime = new Date(now.getTime() - 19 * 3600 * 1000).toISOString();

    expect(getSlaStatus(upcomingDeadline, 'IN_PROGRESS', false, createdTime)).toBe('approaching');
  });

  it('marks complaints as healthy when well within SLA window', () => {
    const distantDeadline = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
    const createdTime = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();

    expect(getSlaStatus(distantDeadline, 'ASSIGNED', false, createdTime)).toBe('healthy');
  });

  it('formats remaining time and overdue time correctly', () => {
    const futureDeadline = new Date(Date.now() + (4 * 3600 + 32 * 60) * 1000).toISOString();
    const remaining = calculateRemainingTime(futureDeadline);

    expect(remaining.isBreached).toBe(false);
    expect(remaining.hours).toBe(4);
    expect(remaining.minutes).toBe(32);
    expect(remaining.formatted).toBe('04h 32m');

    const overdueDeadline = new Date(Date.now() - (2 * 3600 + 15 * 60) * 1000).toISOString();
    const overdue = calculateRemainingTime(overdueDeadline);

    expect(overdue.isBreached).toBe(true);
    expect(overdue.hours).toBe(2);
    expect(overdue.minutes).toBe(15);
    expect(overdue.formatted).toBe('Overdue by 02h 15m');
  });

  it('calculates SLA progress percent accurately and clamps between 0 and 100', () => {
    const created = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
    const deadline = new Date(now.getTime() + 12 * 3600 * 1000).toISOString();

    const percent = getSlaProgressPercent(created, deadline);
    expect(percent).toBe(50);

    // Overdue progress
    const overdueDeadline = new Date(now.getTime() - 6 * 3600 * 1000).toISOString();
    expect(getSlaProgressPercent(created, overdueDeadline)).toBe(100);
  });
});
