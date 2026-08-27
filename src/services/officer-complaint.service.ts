'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ComplaintStatus, ComplaintWithRelations } from '@/types';

export interface OfficerDashboardStats {
  assigned: number;
  critical: number;
  highPriority: number;
  inProgress: number;
  completed: number;
  slaApproaching: number;
  slaBreached: number;
}

/**
 * Get current user's officer record ID
 */
export async function getCurrentOfficerId(): Promise<string | null> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const supabase = createAdminClient();
  const { data: officer } = await supabase
    .from('officers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  return officer?.id || null;
}

/**
 * Fetch Officer Dashboard Summary Metrics
 */
export async function getOfficerDashboardStats(officerId: string): Promise<OfficerDashboardStats> {
  const supabase = createAdminClient();

  const { data: assignments } = await supabase
    .from('complaint_assignments')
    .select(`
      id,
      complaint:complaints(
        id,
        status,
        priority_level,
        sla_deadline,
        sla_breached,
        resolved_at
      )
    `)
    .eq('officer_id', officerId)
    .eq('is_active', true);

  const activeComplaints: any[] = (assignments || [])
    .map((a: any) => a.complaint)
    .filter(Boolean);

  const now = new Date();
  const next12h = new Date(now.getTime() + 12 * 3600 * 1000);

  const critical = activeComplaints.filter((c: any) => c?.priority_level === 'CRITICAL' && c?.status !== 'RESOLVED').length;
  const highPriority = activeComplaints.filter((c: any) => c?.priority_level === 'HIGH' && c?.status !== 'RESOLVED').length;
  const inProgress = activeComplaints.filter((c: any) => c?.status === 'IN_PROGRESS').length;
  const assigned = activeComplaints.filter((c: any) => c?.status === 'ASSIGNED' || c?.status === 'ACCEPTED').length;

  const { count: completedCount } = await supabase
    .from('complaint_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('officer_id', officerId)
    .eq('status', 'completed');

  const slaApproaching = activeComplaints.filter((c: any) => {
    if (!c?.sla_deadline || c?.status === 'RESOLVED') return false;
    const deadline = new Date(c.sla_deadline);
    return deadline > now && deadline <= next12h;
  }).length;

  const slaBreached = activeComplaints.filter((c: any) => {
    if (c?.status === 'RESOLVED') return false;
    if (c?.sla_breached) return true;
    if (!c?.sla_deadline) return false;
    return new Date(c.sla_deadline) < now;
  }).length;

  return {
    assigned,
    critical,
    highPriority,
    inProgress,
    completed: completedCount || 0,
    slaApproaching,
    slaBreached,
  };
}

/**
 * Fetch Complaints Assigned to Officer (Priority Queue)
 */
export async function getOfficerComplaints(
  officerId: string,
  options: {
    status?: string;
    priority?: string;
    search?: string;
  } = {}
) {
  const supabase = createAdminClient();

  let query = supabase
    .from('complaint_assignments')
    .select(`
      id,
      status,
      assigned_at,
      accepted_at,
      notes,
      complaint:complaints(
        *,
        citizen:profiles!complaints_citizen_id_fkey(full_name, phone, email),
        category:complaint_categories(name, code),
        department:departments(name, code),
        media:complaint_media(*)
      )
    `)
    .eq('officer_id', officerId)
    .eq('is_active', true);

  const { data: assignments, error } = await query;

  if (error || !assignments) {
    console.error('Error fetching officer complaints:', error);
    return [];
  }

  let complaints = assignments
    .map((a) => a.complaint as unknown as ComplaintWithRelations)
    .filter(Boolean);

  // Filters
  if (options.status && options.status !== 'ALL') {
    complaints = complaints.filter((c) => c.status === options.status);
  }

  if (options.priority && options.priority !== 'ALL') {
    complaints = complaints.filter((c) => c.priority_level === options.priority);
  }

  if (options.search) {
    const s = options.search.toLowerCase();
    complaints = complaints.filter(
      (c) =>
        c.complaint_number.toLowerCase().includes(s) ||
        c.title.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s) ||
        (c.address && c.address.toLowerCase().includes(s))
    );
  }

  // Priority Sort: 1. Critical, 2. High, 3. SLA approaching, 4. Oldest
  return complaints.sort((a, b) => {
    // Score based sorting
    if ((b.priority_score || 0) !== (a.priority_score || 0)) {
      return (b.priority_score || 0) - (a.priority_score || 0);
    }
    if (a.sla_deadline && b.sla_deadline) {
      return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Officer Action: Accept Complaint
 * Transition: ASSIGNED -> ACCEPTED
 */
export async function acceptComplaint(
  complaintId: string,
  officerId: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  // Validate complaint state
  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, status, assigned_officer_id')
    .eq('id', complaintId)
    .single();

  if (!complaint) return { success: false, error: 'Complaint not found' };
  if (complaint.status !== 'ASSIGNED') {
    return { success: false, error: `Invalid transition: Current status is ${complaint.status}` };
  }

  // Update assignment
  await supabase
    .from('complaint_assignments')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('complaint_id', complaintId)
    .eq('officer_id', officerId)
    .eq('is_active', true);

  // Update complaint status
  await supabase
    .from('complaints')
    .update({ status: 'ACCEPTED' as ComplaintStatus })
    .eq('id', complaintId);

  // Add timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: 'ASSIGNED',
    new_status: 'ACCEPTED',
    notes: 'Officer accepted the assignment and confirmed jurisdiction',
    updated_by: user.id,
    is_internal: false,
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'complaint',
    entity_id: complaintId,
    new_data: { status: 'ACCEPTED', officer_id: officerId },
  });

  return { success: true };
}

/**
 * Officer Action: Start Work
 * Transition: ACCEPTED -> IN_PROGRESS
 */
export async function startWorkOnComplaint(
  complaintId: string,
  officerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, status')
    .eq('id', complaintId)
    .single();

  if (!complaint) return { success: false, error: 'Complaint not found' };
  if (complaint.status !== 'ACCEPTED') {
    return { success: false, error: `Invalid transition: Current status is ${complaint.status}` };
  }

  // Update complaint status
  await supabase
    .from('complaints')
    .update({ status: 'IN_PROGRESS' as ComplaintStatus })
    .eq('id', complaintId);

  // Timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: 'ACCEPTED',
    new_status: 'IN_PROGRESS',
    notes: notes || 'Work in progress: Inspection / repair crew dispatched',
    updated_by: user.id,
    is_internal: false,
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'complaint',
    entity_id: complaintId,
    new_data: { status: 'IN_PROGRESS', officer_id: officerId },
  });

  return { success: true };
}

/**
 * Officer Action: Add Progress Update Note & Optional Photo
 */
export async function addComplaintProgressUpdate(
  complaintId: string,
  officerId: string,
  notes: string,
  mediaUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  const { data: complaint } = await supabase
    .from('complaints')
    .select('status')
    .eq('id', complaintId)
    .single();

  if (!complaint) return { success: false, error: 'Complaint not found' };

  // Add progress update timeline entry
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: complaint.status,
    new_status: complaint.status,
    notes: `Field Officer Update: ${notes}`,
    updated_by: user.id,
    is_internal: false,
  });

  // If photo attached
  if (mediaUrl) {
    await supabase.from('complaint_media').insert({
      complaint_id: complaintId,
      url: mediaUrl,
      media_type: 'image',
      is_resolution_evidence: false,
      uploaded_by: user.id,
      caption: 'Field progress photo',
    });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'complaint_progress_update',
    entity_id: complaintId,
    new_data: { notes, officer_id: officerId },
  });

  return { success: true };
}

/**
 * Officer Action: Mark Resolved with Evidence
 * Transition: IN_PROGRESS -> RESOLVED
 */
export async function resolveComplaint(
  complaintId: string,
  officerId: string,
  resolutionNotes: string,
  evidenceUrls: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = createAdminClient();

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, status, citizen_id, title, complaint_number')
    .eq('id', complaintId)
    .single();

  if (!complaint) return { success: false, error: 'Complaint not found' };
  if (complaint.status !== 'IN_PROGRESS') {
    return { success: false, error: `Invalid transition: Complaint must be IN_PROGRESS before resolving (current: ${complaint.status})` };
  }

  const resolvedAt = new Date().toISOString();

  // 1. Upload resolution media records
  if (evidenceUrls.length > 0) {
    const mediaInserts = evidenceUrls.map((url) => ({
      complaint_id: complaintId,
      url,
      media_type: 'image' as const,
      is_resolution_evidence: true,
      uploaded_by: user.id,
      caption: 'Official Resolution Evidence',
    }));
    await supabase.from('complaint_media').insert(mediaInserts);
  }

  // 2. Mark assignment completed
  await supabase
    .from('complaint_assignments')
    .update({
      status: 'completed',
      completed_at: resolvedAt,
      notes: resolutionNotes,
    })
    .eq('complaint_id', complaintId)
    .eq('officer_id', officerId)
    .eq('is_active', true);

  // 3. Update complaint status to RESOLVED
  await supabase
    .from('complaints')
    .update({
      status: 'RESOLVED' as ComplaintStatus,
      resolved_at: resolvedAt,
    })
    .eq('id', complaintId);

  // 4. Update officer workload and resolution stats
  const { data: officer } = await supabase
    .from('officers')
    .select('active_complaints, total_resolved')
    .eq('id', officerId)
    .single();

  if (officer) {
    const activeCount = Math.max(0, (officer.active_complaints || 1) - 1);
    await supabase
      .from('officers')
      .update({
        active_complaints: activeCount,
        total_resolved: (officer.total_resolved || 0) + 1,
        status: 'available',
      })
      .eq('id', officerId);
  }

  // 5. Add timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: 'IN_PROGRESS',
    new_status: 'RESOLVED',
    notes: `Resolved: ${resolutionNotes}`,
    updated_by: user.id,
    is_internal: false,
  });

  // 6. Notify Citizen
  await supabase.from('notifications').insert({
    user_id: complaint.citizen_id,
    title: 'Complaint Resolved',
    message: `Your complaint ${complaint.complaint_number} "${complaint.title}" has been resolved by the field officer. Please verify.`,
    type: 'complaint_resolved',
    complaint_id: complaintId,
    action_url: `/citizen/complaints/${complaintId}`,
  });

  // 7. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'complaint_resolved',
    entity_type: 'complaint',
    entity_id: complaintId,
    new_data: { notes: resolutionNotes, officer_id: officerId, evidence_count: evidenceUrls.length },
  });

  return { success: true };
}
