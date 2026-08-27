'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { PriorityLevel } from '@/types';

interface SlaBreachedRecord {
  complaint_id: string;
  complaint_number: string;
  department_id: string;
  priority: PriorityLevel;
  deadline: string;
}

/**
 * Check for SLA breaches and create escalation records.
 * This should be called periodically (e.g., via cron or edge function).
 */
export async function checkAndEscalateSLABreaches(): Promise<{
  breachedCount: number;
  escalatedIds: string[];
}> {
  const supabase = createAdminClient();

  // Call the database function to find and mark breaches
  const { data: rawBreached, error } = await supabase.rpc('check_sla_breaches');

  if (error || !rawBreached) {
    console.error('SLA breach check failed:', error);
    return { breachedCount: 0, escalatedIds: [] };
  }

  const breached = (rawBreached as unknown as SlaBreachedRecord[]) || [];
  const escalatedIds: string[] = [];

  for (const complaint of breached) {
    // Check if an escalation already exists for this complaint
    const { data: existingEscalation } = await supabase
      .from('escalations')
      .select('id')
      .eq('complaint_id', complaint.complaint_id)
      .eq('is_resolved', false)
      .maybeSingle();

    if (existingEscalation) continue; // Already escalated

    // Create escalation
    const { error: escError } = await supabase.from('escalations').insert({
      complaint_id: complaint.complaint_id,
      reason: `SLA breached: ${complaint.priority} priority complaint exceeded deadline`,
      level: complaint.priority === 'CRITICAL' ? 'super_admin' : 'department_admin',
    });

    if (!escError) {
      escalatedIds.push(complaint.complaint_id);

      // Notify department admins
      if (complaint.department_id) {
        const { data: deptAdmins } = await supabase
          .from('officers')
          .select('profile_id')
          .eq('department_id', complaint.department_id);

        if (deptAdmins && deptAdmins.length > 0) {
          const notifications = deptAdmins.map((admin) => ({
            user_id: admin.profile_id,
            title: 'SLA Breached',
            message: `Complaint ${complaint.complaint_number} has breached its SLA deadline`,
            type: 'sla_breached' as const,
            complaint_id: complaint.complaint_id,
            action_url: `/department/complaints/${complaint.complaint_id}`,
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      // If critical, also notify super admins
      if (complaint.priority === 'CRITICAL') {
        const { data: superAdmins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'super_admin');

        if (superAdmins && superAdmins.length > 0) {
          const adminNotifications = superAdmins.map((admin) => ({
            user_id: admin.id,
            title: 'CRITICAL SLA Breach',
            message: `Critical complaint ${complaint.complaint_number} has breached SLA`,
            type: 'escalation' as const,
            complaint_id: complaint.complaint_id,
            action_url: `/admin/complaints/${complaint.complaint_id}`,
          }));

          await supabase.from('notifications').insert(adminNotifications);
        }
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'escalation_created',
        entity_type: 'complaint',
        entity_id: complaint.complaint_id,
        new_data: { reason: 'SLA breached', priority: complaint.priority },
      });
    }
  }

  return { breachedCount: breached.length, escalatedIds };
}
