import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  getPriorityLevel,
  getSLADeadline,
  isSLABreached,
  getSLAStatus,
  BASE_SEVERITY_SCORES,
} from '../services/priority.service';

describe('Priority Calculation & SLA Engine', () => {
  it('should return exact base severity scores when no adjustments apply', () => {
    expect(BASE_SEVERITY_SCORES.LOW).toBe(25);
    expect(BASE_SEVERITY_SCORES.MEDIUM).toBe(50);
    expect(BASE_SEVERITY_SCORES.HIGH).toBe(75);
    expect(BASE_SEVERITY_SCORES.CRITICAL).toBe(95);

    expect(calculatePriorityScore({ severity: 'LOW', affectedCount: 1 })).toBe(25);
    expect(calculatePriorityScore({ severity: 'MEDIUM', affectedCount: 1 })).toBe(50);
    expect(calculatePriorityScore({ severity: 'HIGH', affectedCount: 1 })).toBe(75);
    expect(calculatePriorityScore({ severity: 'CRITICAL', affectedCount: 1 })).toBe(95);
  });

  it('should apply bounded adjustments for affected citizens count', () => {
    // 5 people: +4
    expect(calculatePriorityScore({ severity: 'MEDIUM', affectedCount: 5 })).toBe(54);
    // 20 people: +8
    expect(calculatePriorityScore({ severity: 'MEDIUM', affectedCount: 20 })).toBe(58);
    // 50 people: +12
    expect(calculatePriorityScore({ severity: 'MEDIUM', affectedCount: 50 })).toBe(62);
    // 100+ people: +15
    expect(calculatePriorityScore({ severity: 'MEDIUM', affectedCount: 150 })).toBe(65);
  });

  it('should apply location risk and frequency bounded adjustments', () => {
    // Location risk 1.0 -> +10
    const highRiskLoc = calculatePriorityScore({
      severity: 'HIGH',
      locationRisk: 1.0,
      complaintFrequency: 0,
    });
    expect(highRiskLoc).toBe(85); // 75 + 10

    // Frequency 5 -> +8
    const frequentComplaints = calculatePriorityScore({
      severity: 'HIGH',
      locationRisk: 0,
      complaintFrequency: 5,
    });
    expect(frequentComplaints).toBe(83); // 75 + 8
  });

  it('should strictly clamp scores between 0 and 100', () => {
    // Super critical multi-factor maximum should not exceed 100
    const maxScore = calculatePriorityScore({
      severity: 'CRITICAL',
      affectedCount: 500,
      locationRisk: 1.0,
      complaintFrequency: 10,
      slaUrgency: 1.0,
    });
    expect(maxScore).toBe(100);

    // Lowest possible score must be >= 0
    const minScore = calculatePriorityScore({
      severity: 'LOW',
      affectedCount: 0,
      locationRisk: 0,
      complaintFrequency: 0,
    });
    expect(minScore).toBeGreaterThanOrEqual(0);
    expect(minScore).toBeLessThanOrEqual(100);
  });

  it('should deterministically map numerical scores to priority levels', () => {
    // 90-100 -> CRITICAL
    expect(getPriorityLevel(100)).toBe('CRITICAL');
    expect(getPriorityLevel(95)).toBe('CRITICAL');
    expect(getPriorityLevel(90)).toBe('CRITICAL');

    // 75-89 -> HIGH
    expect(getPriorityLevel(89)).toBe('HIGH');
    expect(getPriorityLevel(80)).toBe('HIGH');
    expect(getPriorityLevel(75)).toBe('HIGH');

    // 50-74 -> MEDIUM
    expect(getPriorityLevel(74)).toBe('MEDIUM');
    expect(getPriorityLevel(60)).toBe('MEDIUM');
    expect(getPriorityLevel(50)).toBe('MEDIUM');

    // 0-49 -> LOW
    expect(getPriorityLevel(49)).toBe('LOW');
    expect(getPriorityLevel(25)).toBe('LOW');
    expect(getPriorityLevel(0)).toBe('LOW');
  });

  it('should compute correct SLA deadlines', () => {
    const baseDate = new Date('2026-08-27T10:00:00Z');

    // Critical: 1 hour
    const criticalDeadline = getSLADeadline('CRITICAL', baseDate);
    expect(criticalDeadline.toISOString()).toBe('2026-08-27T11:00:00.000Z');

    // High: 6 hours
    const highDeadline = getSLADeadline('HIGH', baseDate);
    expect(highDeadline.toISOString()).toBe('2026-08-27T16:00:00.000Z');

    // Medium: 24 hours
    const mediumDeadline = getSLADeadline('MEDIUM', baseDate);
    expect(mediumDeadline.toISOString()).toBe('2026-08-28T10:00:00.000Z');

    // Low: 72 hours
    const lowDeadline = getSLADeadline('LOW', baseDate);
    expect(lowDeadline.toISOString()).toBe('2026-08-30T10:00:00.000Z');
  });

  it('should accurately detect SLA breaches', () => {
    const pastDeadline = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString();

    expect(isSLABreached(pastDeadline)).toBe(true);
    expect(isSLABreached(futureDeadline)).toBe(false);

    const breachedStatus = getSLAStatus(pastDeadline);
    expect(breachedStatus.breached).toBe(true);
    expect(breachedStatus.label).toBe('SLA Breached');

    const activeStatus = getSLAStatus(futureDeadline);
    expect(activeStatus.breached).toBe(false);
  });
});
