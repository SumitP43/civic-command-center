import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  calculateAssignmentScore,
} from '@/lib/assignment-scoring';
import type { OfficerWithProfile } from '@/types';

describe('Smart Officer Assignment Engine', () => {
  const mockProfile = {
    id: 'p-1',
    full_name: 'Rajesh Kumar',
    email: 'rajesh@demo.gov.in',
    phone: '+919876543210',
    avatar_url: null,
    address: 'Sector 62',
    city: 'Noida',
    state: 'UP',
    pincode: '201301',
    role: 'officer' as const,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockDepartment = {
    id: 'd-1',
    name: 'Public Works Department',
    code: 'PWD',
    description: 'Roads & Infrastructure',
    head_officer_id: null,
    contact_email: 'pwd@noida.gov.in',
    contact_phone: '+911202550001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAvailableOfficer: OfficerWithProfile = {
    id: 'off-1',
    profile_id: 'p-1',
    department_id: 'd-1',
    badge_number: 'PWD-101',
    designation: 'Senior Road Inspector',
    status: 'available',
    specialization: ['pothole', 'road_damage', 'asphalt'],
    latitude: 28.5355,
    longitude: 77.3910,
    active_complaints: 2,
    max_complaints: 10,
    total_resolved: 45,
    avg_resolution_hours: 3.5,
    rating: 4.9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: mockProfile,
    department: mockDepartment,
  };

  it('calculates accurate Haversine distance in kilometers', () => {
    // Distance between Sector 62 (28.6280, 77.3649) and Sector 18 (28.5708, 77.3271) ~ 7.3 km
    const dist = calculateHaversineDistance(28.6280, 77.3649, 28.5708, 77.3271);
    expect(dist).toBeGreaterThan(6.5);
    expect(dist).toBeLessThan(8.0);
  });

  it('awards high score for available officer with matching specialization and close distance', () => {
    const analysis = calculateAssignmentScore(
      mockAvailableOfficer,
      'Road Infrastructure Pothole',
      { lat: 28.5400, lon: 77.3950 } // ~0.6 km away
    );

    expect(analysis.score).toBeGreaterThanOrEqual(90);
    expect(analysis.availabilityScore).toBe(40);
    expect(analysis.skillScore).toBe(25);
    expect(analysis.workloadScore).toBe(16); // 8/10 remaining -> (8/10)*20 = 16
    expect(analysis.proximityScore).toBe(15); // < 2km -> 15
    expect(analysis.canAssign).toBe(true);
  });

  it('reduces score when officer is busy', () => {
    const busyOfficer: OfficerWithProfile = {
      ...mockAvailableOfficer,
      status: 'busy',
      active_complaints: 7,
    };

    const analysis = calculateAssignmentScore(
      busyOfficer,
      'Pothole',
      { lat: 28.5355, lon: 77.3910 }
    );

    expect(analysis.availabilityScore).toBe(15);
    expect(analysis.workloadScore).toBe(6); // 3/10 remaining -> 6
    expect(analysis.score).toBeLessThan(75);
    expect(analysis.canAssign).toBe(true);
  });

  it('strictly blocks assignment when officer is at max capacity', () => {
    const atCapacityOfficer: OfficerWithProfile = {
      ...mockAvailableOfficer,
      active_complaints: 10,
      max_complaints: 10,
    };

    const analysis = calculateAssignmentScore(
      atCapacityOfficer,
      'Pothole',
      { lat: 28.5355, lon: 77.3910 }
    );

    expect(analysis.workloadScore).toBe(0);
    expect(analysis.canAssign).toBe(false);
  });

  it('strictly blocks assignment when officer is inactive or on leave', () => {
    const onLeaveOfficer: OfficerWithProfile = {
      ...mockAvailableOfficer,
      status: 'on_leave',
    };

    const analysis = calculateAssignmentScore(
      onLeaveOfficer,
      'Pothole',
      { lat: 28.5355, lon: 77.3910 }
    );

    expect(analysis.availabilityScore).toBe(0);
    expect(analysis.canAssign).toBe(false);
  });
});
