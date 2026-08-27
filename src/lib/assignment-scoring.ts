import type { OfficerWithProfile } from '@/types';

export interface OfficerRecommendation {
  officer: OfficerWithProfile;
  score: number;
  distanceKm: number | null;
  availabilityScore: number;
  skillScore: number;
  workloadScore: number;
  proximityScore: number;
  canAssign: boolean;
  reasons: string[];
}

/**
 * Calculates Haversine distance in kilometers between two geo-coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Deterministic Assignment Score Calculation (0 - 100)
 * Weights:
 * - Availability: 40 pts
 * - Skill Match: 25 pts
 * - Workload Capacity: 20 pts
 * - Proximity: 15 pts
 */
export function calculateAssignmentScore(
  officer: OfficerWithProfile,
  complaintCategory?: string | null,
  complaintLocation?: { lat: number; lon: number } | null
): {
  score: number;
  distanceKm: number | null;
  availabilityScore: number;
  skillScore: number;
  workloadScore: number;
  proximityScore: number;
  canAssign: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. Availability Score (0 - 40 pts)
  let availabilityScore = 0;
  if (officer.status === 'available') {
    availabilityScore = 40;
    reasons.push('Officer is actively available on duty');
  } else if (officer.status === 'busy') {
    availabilityScore = 15;
    reasons.push('Officer is busy with ongoing fieldwork');
  } else {
    availabilityScore = 0;
    reasons.push(`Officer is unavailable (${officer.status})`);
  }

  // 2. Skill Match Score (0 - 25 pts)
  let skillScore = 10; // Base score for same department
  if (complaintCategory && officer.specialization && officer.specialization.length > 0) {
    const normCategory = complaintCategory.toLowerCase();
    const isSpecialist = officer.specialization.some((spec) =>
      normCategory.includes(spec.toLowerCase()) || spec.toLowerCase().includes(normCategory)
    );
    if (isSpecialist) {
      skillScore = 25;
      reasons.push('Specialization matches complaint category exactly');
    } else {
      skillScore = 15;
      reasons.push('General department staff match');
    }
  } else {
    reasons.push('Standard departmental skills match');
  }

  // 3. Workload Capacity Score (0 - 20 pts)
  const activeCount = officer.active_complaints || 0;
  const maxCount = officer.max_complaints || 10;
  const remainingCapacity = Math.max(0, maxCount - activeCount);
  const capacityRatio = maxCount > 0 ? remainingCapacity / maxCount : 0;
  const workloadScore = Math.round(capacityRatio * 20);

  if (remainingCapacity === 0) {
    reasons.push('Officer has reached maximum workload limit');
  } else {
    reasons.push(`${remainingCapacity} of ${maxCount} case slots available`);
  }

  // 4. Proximity Score (0 - 15 pts)
  let distanceKm: number | null = null;
  let proximityScore = 10; // Default when location not available

  if (
    complaintLocation &&
    officer.latitude != null &&
    officer.longitude != null
  ) {
    distanceKm = calculateHaversineDistance(
      complaintLocation.lat,
      complaintLocation.lon,
      Number(officer.latitude),
      Number(officer.longitude)
    );

    if (distanceKm <= 2) {
      proximityScore = 15;
      reasons.push(`Immediate proximity (${distanceKm} km away)`);
    } else if (distanceKm <= 5) {
      proximityScore = 12;
      reasons.push(`Close vicinity (${distanceKm} km away)`);
    } else if (distanceKm <= 10) {
      proximityScore = 8;
      reasons.push(`Moderate distance (${distanceKm} km away)`);
    } else if (distanceKm <= 25) {
      proximityScore = 4;
      reasons.push(`Extended distance (${distanceKm} km away)`);
    } else {
      proximityScore = 1;
      reasons.push(`Far location (${distanceKm} km away)`);
    }
  } else {
    reasons.push('Proximity score estimated based on regional sector');
  }

  // Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.max(0, availabilityScore + skillScore + workloadScore + proximityScore)
  );

  // Can assign check: must have capacity and be either available or busy
  const canAssign = remainingCapacity > 0 && (officer.status === 'available' || officer.status === 'busy');

  return {
    score: totalScore,
    distanceKm,
    availabilityScore,
    skillScore,
    workloadScore,
    proximityScore,
    canAssign,
    reasons,
  };
}
