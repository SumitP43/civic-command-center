'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processComplaintAI } from '@/services/ai-complaint.service';
import { complaintSchema, feedbackSchema, type ComplaintFormData, type FeedbackFormData } from '@/lib/validators/complaint';
import type { ComplaintStatus, ComplaintWithRelations, Database } from '@/types';

export type ComplaintResult = {
  error?: string;
  data?: { id: string; complaint_number: string };
};

/**
 * Create a new complaint with AI classification pipeline
 */
export async function createComplaint(
  formData: ComplaintFormData,
  mediaUrls?: string[]
): Promise<ComplaintResult> {
  const validated = complaintSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid complaint data' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Step 1: Create the initial complaint record in SUBMITTED state
  const { data: complaint, error: insertError } = await supabase
    .from('complaints')
    .insert({
      citizen_id: user.id,
      title: validated.data.title,
      description: validated.data.description,
      address: validated.data.address,
      landmark: validated.data.landmark || null,
      location: validated.data.latitude && validated.data.longitude
        ? `POINT(${validated.data.longitude} ${validated.data.latitude})`
        : null,
      affected_count: validated.data.affected_count || 1,
      status: 'SUBMITTED',
      ai_processing_status: 'pending',
      requires_manual_review: false,
      priority_score: 0,
    })
    .select('id, complaint_number')
    .single();

  if (insertError || !complaint) {
    console.error('Failed to insert complaint:', insertError);
    return { error: insertError?.message || 'Failed to create complaint' };
  }

  // Step 2: Upload attached media references if present
  if (mediaUrls && mediaUrls.length > 0) {
    const mediaInserts = mediaUrls.map((url) => ({
      complaint_id: complaint.id,
      url,
      media_type: url.match(/\.(mp4|mov|avi|webm)$/i) ? ('video' as const) : ('image' as const),
      uploaded_by: user.id,
    }));

    await supabase.from('complaint_media').insert(mediaInserts);
  }

  // Step 3: Record initial submission update log
  await supabase.from('complaint_updates').insert({
    complaint_id: complaint.id,
    new_status: 'SUBMITTED',
    notes: 'Complaint submitted by citizen',
    updated_by: user.id,
  });

  // Step 4: Audit log creation
  const adminClient = createAdminClient();
  await adminClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'complaint_created',
    entity_type: 'complaint',
    entity_id: complaint.id,
    new_data: { title: validated.data.title, description: validated.data.description },
  });

  // Step 5: Trigger AI Processing Pipeline (non-blocking for resilient creation)
  try {
    await processComplaintAI(complaint.id);
  } catch (aiErr) {
    console.error(`[Complaint Service] AI pipeline error for ${complaint.id}:`, aiErr);
  }

  return { data: { id: complaint.id, complaint_number: complaint.complaint_number } };
}

/**
 * Get a complaint by ID with all related data
 */
export async function getComplaintById(id: string): Promise<ComplaintWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('complaints')
    .select(`
      *,
      citizen:profiles!complaints_citizen_id_fkey(*),
      category:complaint_categories(*),
      department:departments(*),
      media:complaint_media(*),
      updates:complaint_updates(*),
      assignments:complaint_assignments(
        *,
        officer:officers(
          *,
          profile:profiles(*)
        )
      ),
      ai_analysis(*),
      feedback(*),
      escalations(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching complaint:', error);
    return null;
  }

  return data as unknown as ComplaintWithRelations;
}

/**
 * Update complaint status with validation and timeline logging
 */
export async function updateComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get current complaint status
  const { data: complaint } = await supabase
    .from('complaints')
    .select('status')
    .eq('id', complaintId)
    .single();

  if (!complaint) {
    return { error: 'Complaint not found' };
  }

  // Update complaint
  const updateData: Database['public']['Tables']['complaints']['Update'] = { status: newStatus };
  if (newStatus === 'RESOLVED') {
    updateData.resolved_at = new Date().toISOString();
  }
  if (newStatus === 'CLOSED') {
    updateData.closed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('complaints')
    .update(updateData)
    .eq('id', complaintId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Log the update
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: complaint.status,
    new_status: newStatus,
    notes: notes || null,
    updated_by: user.id,
  });

  // Audit log
  const adminClient = createAdminClient();
  await adminClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'complaint',
    entity_id: complaintId,
    old_data: { status: complaint.status },
    new_data: { status: newStatus },
  });

  // Create notification for citizen
  const { data: complaintData } = await supabase
    .from('complaints')
    .select('citizen_id, title')
    .eq('id', complaintId)
    .single();

  if (complaintData) {
    await adminClient.from('notifications').insert({
      user_id: complaintData.citizen_id,
      title: 'Status Updated',
      message: `Your complaint "${complaintData.title}" status changed to ${newStatus}`,
      type: 'status_changed',
      complaint_id: complaintId,
      action_url: `/citizen/complaints/${complaintId}`,
    });
  }

  return {};
}

/**
 * Assign a complaint to an officer
 */
export async function assignComplaint(
  complaintId: string,
  officerId: string,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Deactivate any existing active assignments
  await supabase
    .from('complaint_assignments')
    .update({ is_active: false })
    .eq('complaint_id', complaintId)
    .eq('is_active', true);

  // Create new assignment
  const { error: assignError } = await supabase
    .from('complaint_assignments')
    .insert({
      complaint_id: complaintId,
      officer_id: officerId,
      assigned_by: user.id,
      notes: notes || null,
    });

  if (assignError) {
    return { error: assignError.message };
  }

  // Update complaint status to ASSIGNED
  await supabase
    .from('complaints')
    .update({ status: 'ASSIGNED' })
    .eq('id', complaintId);

  // Get officer's profile_id for notification
  const { data: officer } = await supabase
    .from('officers')
    .select('profile_id, active_complaints')
    .eq('id', officerId)
    .single();

  if (officer) {
    const adminClient = createAdminClient();
    const { data: complaint } = await supabase
      .from('complaints')
      .select('title, priority_level')
      .eq('id', complaintId)
      .single();

    await adminClient.from('notifications').insert({
      user_id: officer.profile_id,
      title: 'New Assignment',
      message: `New ${complaint?.priority_level || ''} priority complaint assigned: ${complaint?.title || 'Unknown'}`,
      type: 'complaint_assigned',
      complaint_id: complaintId,
      action_url: `/officer/complaints/${complaintId}`,
    });

    // Increment officer active complaints count
    await adminClient
      .from('officers')
      .update({ active_complaints: (officer.active_complaints || 0) + 1 })
      .eq('id', officerId);
  }

  // Log update in timeline
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: 'AI_ANALYZED',
    new_status: 'ASSIGNED',
    notes: notes || 'Complaint assigned to officer',
    updated_by: user.id,
    is_internal: true,
  });

  // Audit
  const adminClient = createAdminClient();
  await adminClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'complaint_assigned',
    entity_type: 'complaint',
    entity_id: complaintId,
    new_data: { officer_id: officerId },
  });

  return {};
}

/**
  * Submit citizen verification feedback on a resolved complaint
  */
export async function submitCitizenFeedback(formData: FeedbackFormData): Promise<{ error?: string }> {
  const validated = feedbackSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid feedback details' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Insert feedback record
  const { error: fbErr } = await supabase.from('feedback').insert({
    complaint_id: validated.data.complaint_id,
    citizen_id: user.id,
    rating: validated.data.rating,
    comment: validated.data.comment || null,
    is_resolution_accepted: validated.data.is_resolution_accepted,
  });

  if (fbErr) {
    return { error: fbErr.message };
  }

  // Update status based on acceptance
  const nextStatus: ComplaintStatus = validated.data.is_resolution_accepted ? 'CLOSED' : 'REOPENED';
  await updateComplaintStatus(
    validated.data.complaint_id,
    nextStatus,
    validated.data.is_resolution_accepted
      ? `Citizen accepted resolution with rating ${validated.data.rating}/5`
      : `Citizen rejected resolution: ${validated.data.comment || 'Issue persists'}`
  );

  return {};
}

