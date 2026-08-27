'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EscalationLevel, PriorityLevel } from '@/types';

export interface EscalationFilterOptions {
  departmentId?: string;
  priority?: PriorityLevel | 'ALL';
  level?: EscalationLevel | 'ALL';
  isResolved?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface EscalationWithDetails {
  id: string;
  complaint_id: string;
  reason: string;
  level: EscalationLevel;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  complaint?: {
    id: string;
    complaint_number: string;
    title: string;
    priority_level: PriorityLevel;
    priority_score: number;
    status: string;
    sla_deadline: string | null;
    sla_breached: boolean;
    department?: { id: string; name: string; code: string } | null;
    assignments?: {
      officer?: {
        id: string;
        badge_number: string;
        profile?: { full_name: string; email: string } | null;
      } | null;
    }[];
  } | null;
}

/**
 * Fetch filterable list of escalations
 */
export async function getEscalations(
  filters: EscalationFilterOptions = {}
): Promise<{ data: EscalationWithDetails[]; total: number }> {
  const supabase = createAdminClient();
  const {
    departmentId,
    priority = 'ALL',
    level = 'ALL',
    isResolved = false,
    search,
    page = 1,
    pageSize = 50,
  } = filters;

  let query = supabase
    .from('escalations')
    .select(`
      *,
      complaint:complaints(
        id,
        complaint_number,
        title,
        priority_level,
        priority_score,
        status,
        sla_deadline,
        sla_breached,
        department:departments(id, name, code),
        assignments:complaint_assignments(
          is_active,
          officer:officers(
            id,
            badge_number,
            profile:profiles(full_name, email)
          )
        )
      )
    `, { count: 'exact' });

  if (isResolved !== undefined) {
    query = query.eq('is_resolved', isResolved);
  }

  if (level && level !== 'ALL') {
    query = query.eq('level', level);
  }

  query = query.order('created_at', { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching escalations:', error);
    return { data: [], total: 0 };
  }

  let results = (data || []) as unknown as EscalationWithDetails[];

  // In-memory filter for nested complaint attributes if needed
  if (departmentId) {
    results = results.filter(
      (e) => e.complaint?.department?.id === departmentId
    );
  }

  if (priority && priority !== 'ALL') {
    results = results.filter(
      (e) => e.complaint?.priority_level === priority
    );
  }

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((e) => {
      const matchNum = e.complaint?.complaint_number?.toLowerCase().includes(s);
      const matchTitle = e.complaint?.title?.toLowerCase().includes(s);
      const matchReason = e.reason?.toLowerCase().includes(s);
      return matchNum || matchTitle || matchReason;
    });
  }

  return { data: results, total: count || results.length };
}

/**
 * Resolve an active escalation with notes
 */
export async function resolveEscalation(
  escalationId: string,
  resolutionNotes: string
): Promise<{ success: boolean; error?: string }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = createAdminClient();

  const { data: escalation, error: fetchErr } = await supabase
    .from('escalations')
    .select('id, complaint_id, level')
    .eq('id', escalationId)
    .single();

  if (fetchErr || !escalation) {
    return { success: false, error: 'Escalation record not found' };
  }

  const { error: updateErr } = await supabase
    .from('escalations')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution_notes: resolutionNotes,
    })
    .eq('id', escalationId);

  if (updateErr) {
    console.error('Failed to resolve escalation:', updateErr);
    return { success: false, error: updateErr.message };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'escalation_resolved',
    entity_type: 'escalation',
    entity_id: escalationId,
    new_data: { notes: resolutionNotes, resolved_at: new Date().toISOString() },
  });

  return { success: true };
}

/**
 * Triggers server-side SLA breach check and multi-tier escalation evaluation
 */
export async function triggerSlaEvaluationCron(): Promise<{
  success: boolean;
  evaluatedCount: number;
  escalatedCount: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('evaluate_and_escalate_sla');

  if (error) {
    console.error('Error in evaluate_and_escalate_sla RPC:', error);
    return { success: false, evaluatedCount: 0, escalatedCount: 0, error: error.message };
  }

  const records = (data as any[]) || [];
  const createdEscalations = records.filter((r) => r.escalation_created);

  return {
    success: true,
    evaluatedCount: records.length,
    escalatedCount: createdEscalations.length,
  };
}
