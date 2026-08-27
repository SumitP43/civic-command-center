'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OfficerWithProfile, ComplaintStatus } from '@/types';
import {
  calculateHaversineDistance,
  calculateAssignmentScore,
  type OfficerRecommendation,
} from '@/lib/assignment-scoring';

export type { OfficerRecommendation };

/**
 * Get Ranked Officer Recommendations for a Complaint
 */
export async function getRecommendedOfficers(
  complaintId: string,
  targetDepartmentId?: string
): Promise<OfficerRecommendation[]> {
  const supabase = createAdminClient();

  // Fetch complaint details
  const { data: complaint } = await supabase
    .from('complaints')
    .select(`
      id,
      department_id,
      category_id,
      category:complaint_categories(name),
      location,
      latitude,
      longitude
    `)
    .eq('id', complaintId)
    .single();

  const deptId = targetDepartmentId || complaint?.department_id;
  if (!deptId) return [];

  // Fetch active officers in target department
  const { data: officers } = await supabase
    .from('officers')
    .select(`
      *,
      profile:profiles!officers_profile_id_fkey(*),
      department:departments!officers_department_id_fkey(*)
    `)
    .eq('department_id', deptId)
    .neq('status', 'inactive');

  if (!officers || officers.length === 0) return [];

  // Extract coordinates if available
  const locationCoords = complaint?.latitude && complaint?.longitude
    ? { lat: Number(complaint.latitude), lon: Number(complaint.longitude) }
    : null;

  const categoryName = Array.isArray(complaint?.category)
    ? (complaint?.category[0] as any)?.name
    : (complaint?.category as any)?.name || null;

  const scoredList: OfficerRecommendation[] = officers.map((officer) => {
    const analysis = calculateAssignmentScore(
      officer as unknown as OfficerWithProfile,
      categoryName,
      locationCoords
    );

    return {
      officer: officer as unknown as OfficerWithProfile,
      ...analysis,
    };
  });

  // Sort descending by score, prioritizing canAssign
  return scoredList.sort((a, b) => {
    if (a.canAssign !== b.canAssign) return a.canAssign ? -1 : 1;
    return b.score - a.score;
  });
}

/**
 * Assign an Officer to a Complaint
 */
export async function assignOfficerToComplaint(
  complaintId: string,
  officerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = createAdminClient();

  // Fetch current complaint & officer
  const [complaintRes, officerRes] = await Promise.all([
    supabase.from('complaints').select('id, complaint_number, title, department_id, status').eq('id', complaintId).single(),
    supabase.from('officers').select('id, profile_id, department_id, active_complaints, max_complaints, status').eq('id', officerId).single(),
  ]);

  if (!complaintRes.data) return { success: false, error: 'Complaint not found' };
  if (!officerRes.data) return { success: false, error: 'Officer not found' };

  const complaint = complaintRes.data;
  const officer = officerRes.data;

  // Capacity check
  if ((officer.active_complaints || 0) >= (officer.max_complaints || 10)) {
    return { success: false, error: `Officer is at maximum capacity (${officer.active_complaints}/${officer.max_complaints})` };
  }

  // Deactivate any existing active assignments
  await supabase
    .from('complaint_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      reassignment_reason: 'Reassigned to new officer',
    })
    .eq('complaint_id', complaintId)
    .eq('is_active', true);

  // Create new active assignment
  const { error: assignErr } = await supabase.from('complaint_assignments').insert({
    complaint_id: complaintId,
    officer_id: officerId,
    assigned_by: user.id,
    status: 'pending',
    notes: notes || 'Assigned via Department Command Center',
    is_active: true,
  });

  if (assignErr) {
    return { success: false, error: assignErr.message };
  }

  // Update complaint status to ASSIGNED & department if necessary
  await supabase
    .from('complaints')
    .update({
      status: 'ASSIGNED' as ComplaintStatus,
      assigned_officer_id: officerId,
      department_id: officer.department_id,
    })
    .eq('id', complaintId);

  // Increment officer active count
  await supabase
    .from('officers')
    .update({
      active_complaints: (officer.active_complaints || 0) + 1,
      status: (officer.active_complaints + 1 >= (officer.max_complaints || 10)) ? 'busy' : officer.status,
    })
    .eq('id', officerId);

  // Add timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: complaint.status,
    new_status: 'ASSIGNED',
    notes: `Assigned to Officer: ${notes ? notes : 'Initial assignment'}`,
    updated_by: user.id,
    is_internal: true,
  });

  // Notify officer
  await supabase.from('notifications').insert({
    user_id: officer.profile_id,
    title: 'New Complaint Assigned',
    message: `You have been assigned complaint ${complaint.complaint_number}: "${complaint.title}"`,
    type: 'complaint_assigned',
    complaint_id: complaintId,
    action_url: `/officer/complaints/${complaintId}`,
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'officer_assigned',
    entity_type: 'complaint',
    entity_id: complaintId,
    new_data: { officer_id: officerId, complaint_number: complaint.complaint_number },
  });

  return { success: true };
}

/**
 * Reassign an existing complaint to a different officer with reason tracking
 */
export async function reassignComplaint(
  complaintId: string,
  newOfficerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  // Find previous active assignment
  const { data: prevAssignment } = await supabase
    .from('complaint_assignments')
    .select('*, officer:officers(*)')
    .eq('complaint_id', complaintId)
    .eq('is_active', true)
    .maybeSingle();

  // Decrement previous officer's active count if present
  if (prevAssignment?.officer_id) {
    const prevCount = Math.max(0, (prevAssignment.officer?.active_complaints || 1) - 1);
    await supabase
      .from('officers')
      .update({
        active_complaints: prevCount,
        status: prevCount < (prevAssignment.officer?.max_complaints || 10) ? 'available' : 'busy',
      })
      .eq('id', prevAssignment.officer_id);

    // Notify previous officer
    if (prevAssignment.officer?.profile_id) {
      await supabase.from('notifications').insert({
        user_id: prevAssignment.officer.profile_id,
        title: 'Complaint Reassigned',
        message: `Complaint reassigned: ${reason}`,
        type: 'complaint_assigned',
        complaint_id: complaintId,
      });
    }
  }

  // Deactivate old assignment
  await supabase
    .from('complaint_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      reassignment_reason: reason,
    })
    .eq('complaint_id', complaintId)
    .eq('is_active', true);

  // Assign to new officer
  return await assignOfficerToComplaint(complaintId, newOfficerId, `Reassigned: ${reason}`);
}

/**
 * Department Admin changes the department of a complaint
 * Preserves the original AI analysis and records an audit log
 */
export async function changeComplaintDepartment(
  complaintId: string,
  newDepartmentId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  const { data: currentComplaint } = await supabase
    .from('complaints')
    .select('id, department_id, status, complaint_number')
    .eq('id', complaintId)
    .single();

  if (!currentComplaint) return { success: false, error: 'Complaint not found' };

  // Deactivate existing officer assignments since department changed
  await supabase
    .from('complaint_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      reassignment_reason: `Department changed to ${newDepartmentId}`,
    })
    .eq('complaint_id', complaintId)
    .eq('is_active', true);

  // Update complaint department
  const { error: updateErr } = await supabase
    .from('complaints')
    .update({
      department_id: newDepartmentId,
      assigned_officer_id: null,
      status: 'AI_ANALYZED', // Ready for assignment in new department
    })
    .eq('id', complaintId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Add timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: currentComplaint.status,
    new_status: 'AI_ANALYZED',
    notes: `Department changed by administrator: ${notes || 'Re-routed to correct department'}`,
    updated_by: user.id,
    is_internal: true,
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'admin_change',
    entity_type: 'complaint_department',
    entity_id: complaintId,
    old_data: { department_id: currentComplaint.department_id },
    new_data: { department_id: newDepartmentId, notes },
  });

  return { success: true };
}
