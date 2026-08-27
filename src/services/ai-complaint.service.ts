'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { analyzeComplaintWithGemini } from '@/lib/ai/complaint-analysis';
import { getLiveGroundingContext } from '@/lib/ai/classify';
import { getSLADeadline } from '@/services/priority.service';
import {
  manualCorrectionSchema,
  type ManualCorrectionData,
  type AiAnalysisResult,
} from '@/lib/validators/ai';
import type { ComplaintStatus, PriorityLevel, SeverityLevel, AiProcessingStatus, Database } from '@/types';

export interface AIProcessResult {
  success: boolean;
  complaintId: string;
  processingStatus: AiProcessingStatus;
  requiresManualReview: boolean;
  analysis?: AiAnalysisResult;
  error?: string;
}

/**
 * Server-side AI complaint processing pipeline.
 * Idempotent, safe against failure, and strictly adheres to RBAC & database constraints.
 */
export async function processComplaintAI(
  complaintId: string,
  forceRetry: boolean = false
): Promise<AIProcessResult> {
  const supabase = createAdminClient();

  // Step 1: Idempotency check — verify complaint exists & whether already processed
  const { data: complaint, error: fetchErr } = await supabase
    .from('complaints')
    .select('id, title, description, address, landmark, affected_count, status, ai_processing_status, requires_manual_review, citizen_id')
    .eq('id', complaintId)
    .single();

  if (fetchErr || !complaint) {
    console.error(`[AI Service] Complaint ${complaintId} not found:`, fetchErr);
    return {
      success: false,
      complaintId,
      processingStatus: 'failed',
      requiresManualReview: true,
      error: 'Complaint not found',
    };
  }

  // Idempotency: skip if already completed unless forceRetry is true
  if (complaint.ai_processing_status === 'completed' && !forceRetry) {
    console.log(`[AI Service] Complaint ${complaintId} already processed by AI.`);
    return {
      success: true,
      complaintId,
      processingStatus: 'completed',
      requiresManualReview: complaint.requires_manual_review || false,
    };
  }

  // Mark processing status
  await supabase
    .from('complaints')
    .update({ ai_processing_status: 'processing' })
    .eq('id', complaintId);

  const startTime = Date.now();

  try {
    // Step 2: Load grounding context (active departments & categories)
    const grounding = await getLiveGroundingContext();

    // Step 3: Run Gemini AI analysis with grounding & prompt injection protections
    const analysis: AiAnalysisResult = await analyzeComplaintWithGemini(
      {
        title: complaint.title,
        description: complaint.description,
        address: complaint.address,
        landmark: complaint.landmark,
        affectedCount: complaint.affected_count || 1,
      },
      grounding
    );

    const processingTimeMs = Date.now() - startTime;

    // Step 4: Map recommended department to database ID
    let departmentId: string | null = null;
    if (analysis.recommendedDepartment) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('code', analysis.recommendedDepartment)
        .single();
      if (dept) {
        departmentId = dept.id;
      }
    }

    // Step 5: Map category to database ID
    let categoryId: string | null = null;
    if (analysis.category) {
      const { data: cat } = await supabase
        .from('complaint_categories')
        .select('id')
        .ilike('name', `%${analysis.category}%`)
        .limit(1)
        .maybeSingle();
      if (cat) {
        categoryId = cat.id;
      }
    }

    // Step 6: Determine final processing status & SLA deadline
    const slaDeadline = getSLADeadline(analysis.priorityLevel).toISOString();
    const finalProcessingStatus: AiProcessingStatus = analysis.requiresManualReview
      ? 'manual_review'
      : 'completed';
    const nextComplaintStatus: ComplaintStatus = analysis.requiresManualReview
      ? 'SUBMITTED'
      : 'AI_ANALYZED';

    // Step 7: Upsert AI Analysis record
    await supabase.from('ai_analysis').upsert({
      complaint_id: complaintId,
      raw_response: analysis as unknown as Record<string, unknown>,
      category: analysis.category,
      subcategory: analysis.subcategory,
      severity: analysis.severity,
      priority_score: analysis.priorityScore,
      department_recommendation: analysis.recommendedDepartment,
      summary: analysis.summary,
      risk: analysis.risk,
      reasoning: analysis.reasoning,
      risk_factors: analysis.riskFactors,
      language_detected: analysis.languageDetected,
      translated_text: analysis.translatedText || null,
      confidence_score: analysis.confidence,
      requires_manual_review: analysis.requiresManualReview,
      processing_time_ms: processingTimeMs,
      model_version: 'gemini-2.0-flash',
      error_message: null,
    });

    // Step 8: Update complaint record
    await supabase
      .from('complaints')
      .update({
        status: nextComplaintStatus,
        category_id: categoryId,
        department_id: departmentId,
        severity: analysis.severity,
        priority_score: analysis.priorityScore,
        priority_level: analysis.priorityLevel,
        sla_deadline: slaDeadline,
        ai_processing_status: finalProcessingStatus,
        requires_manual_review: analysis.requiresManualReview,
        ai_confidence: analysis.confidence,
        ai_summary: analysis.summary,
        ai_risk: analysis.risk,
        ai_reasoning: analysis.reasoning,
      })
      .eq('id', complaintId);

    // Step 9: Add update log in complaint timeline
    await supabase.from('complaint_updates').insert({
      complaint_id: complaintId,
      previous_status: complaint.status,
      new_status: nextComplaintStatus,
      notes: `AI Analysis Complete: ${analysis.category} | Severity: ${analysis.severity} | Priority: ${analysis.priorityScore}/100${analysis.requiresManualReview ? ' [Flagged for manual review]' : ''}`,
      updated_by: complaint.citizen_id,
      is_internal: false,
    });

    // Step 10: Create audit log
    await supabase.from('audit_logs').insert({
      action: 'status_changed',
      entity_type: 'complaint',
      entity_id: complaintId,
      new_data: {
        ai_processed: true,
        priority_score: analysis.priorityScore,
        department: analysis.recommendedDepartment,
        confidence: analysis.confidence,
      },
    });

    return {
      success: true,
      complaintId,
      processingStatus: finalProcessingStatus,
      requiresManualReview: analysis.requiresManualReview,
      analysis,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown AI error';
    console.error(`[AI Service] AI processing failed for complaint ${complaintId}:`, errorMsg);

    // Failure resilience: Complaint remains valid in SUBMITTED state with failed status
    await supabase
      .from('complaints')
      .update({
        ai_processing_status: 'failed',
        requires_manual_review: true,
      })
      .eq('id', complaintId);

    // Record error in ai_analysis if possible
    await supabase.from('ai_analysis').upsert({
      complaint_id: complaintId,
      requires_manual_review: true,
      error_message: errorMsg,
    });

    // Log update
    await supabase.from('complaint_updates').insert({
      complaint_id: complaintId,
      previous_status: complaint.status,
      new_status: 'SUBMITTED',
      notes: 'AI automated analysis was unavailable. Flagged for manual department review.',
      updated_by: complaint.citizen_id,
      is_internal: true,
    });

    return {
      success: false,
      complaintId,
      processingStatus: 'failed',
      requiresManualReview: true,
      error: errorMsg,
    };
  }
}

/**
 * Retry AI analysis for a complaint (e.g. after transient API failure)
 */
export async function retryComplaintAI(complaintId: string): Promise<AIProcessResult> {
  const supabase = createAdminClient();

  // Increment retry count
  const { data: existing } = await supabase
    .from('ai_analysis')
    .select('retry_count')
    .eq('complaint_id', complaintId)
    .maybeSingle();

  const retryCount = (existing?.retry_count || 0) + 1;
  await supabase
    .from('ai_analysis')
    .update({ retry_count: retryCount })
    .eq('complaint_id', complaintId);

  return await processComplaintAI(complaintId, true);
}

/**
 * Admin manual review and correction of AI classification.
 * Preserves original AI analysis record intact, updates complaint with corrected values,
 * and creates an immutable audit trail.
 */
export async function manualReviewAIClassification(
  correctionData: ManualCorrectionData
): Promise<{ success: boolean; error?: string }> {
  const validated = manualCorrectionSchema.safeParse(correctionData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Invalid correction data' };
  }

  const { complaintId, categoryId, departmentId, severity, priorityScore, priorityLevel, notes } = validated.data;

  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify caller is admin or department admin
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'department_admin'].includes(profile.role)) {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  const supabase = createAdminClient();

  // Fetch current complaint
  const { data: currentComplaint, error: fetchErr } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .single();

  if (fetchErr || !currentComplaint) {
    return { success: false, error: 'Complaint not found' };
  }

  const updates: Database['public']['Tables']['complaints']['Update'] = {
    requires_manual_review: false,
    ai_processing_status: 'completed',
    manual_reviewed_by: user.id,
    manual_reviewed_at: new Date().toISOString(),
    manual_review_notes: notes || 'Manually reviewed and approved by administrator',
  };

  if (categoryId) updates.category_id = categoryId;
  if (departmentId) updates.department_id = departmentId;
  if (severity) updates.severity = severity;
  if (priorityScore !== undefined) {
    updates.priority_score = priorityScore;
    updates.priority_level = priorityLevel || (priorityScore >= 90 ? 'CRITICAL' : priorityScore >= 75 ? 'HIGH' : priorityScore >= 50 ? 'MEDIUM' : 'LOW');
    updates.sla_deadline = getSLADeadline(updates.priority_level).toISOString();
  }

  // If complaint was still SUBMITTED, advance to AI_ANALYZED (ready for assignment)
  if (currentComplaint.status === 'SUBMITTED') {
    updates.status = 'AI_ANALYZED';
  }

  const { error: updateErr } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', complaintId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Add complaint update timeline note
  await supabase.from('complaint_updates').insert({
    complaint_id: complaintId,
    previous_status: currentComplaint.status,
    new_status: updates.status || currentComplaint.status,
    notes: `Manual AI Review: ${notes || 'Classification adjusted and verified by administrator'}`,
    updated_by: user.id,
    is_internal: true,
  });

  // Add immutable audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'admin_change',
    entity_type: 'complaint_ai_classification',
    entity_id: complaintId,
    old_data: {
      category_id: currentComplaint.category_id,
      department_id: currentComplaint.department_id,
      severity: currentComplaint.severity,
      priority_score: currentComplaint.priority_score,
      requires_manual_review: currentComplaint.requires_manual_review,
    },
    new_data: updates as unknown as Record<string, unknown>,
  });

  return { success: true };
}

/**
 * Fetch queue of complaints requiring AI manual review
 */
export async function getAIReviewQueue(
  departmentId?: string,
  limit: number = 50,
  offset: number = 0
) {
  const supabase = createAdminClient();

  let query = supabase
    .from('complaints')
    .select(`
      id,
      complaint_number,
      title,
      description,
      status,
      ai_processing_status,
      requires_manual_review,
      ai_confidence,
      ai_summary,
      ai_risk,
      ai_reasoning,
      department_id,
      category_id,
      severity,
      priority_score,
      priority_level,
      created_at,
      department:departments(name, code),
      category:complaint_categories(name, code)
    `)
    .or('requires_manual_review.eq.true,ai_processing_status.in.(failed,manual_review)')
    .order('priority_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching AI review queue:', error);
    return [];
  }

  return data || [];
}
