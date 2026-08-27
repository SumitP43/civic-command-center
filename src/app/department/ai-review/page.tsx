import { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/services/auth.service';
import { AiReviewQueueTable } from '@/components/complaints/ai-review-queue-table';
import { Building2 } from 'lucide-react';
import type { ComplaintWithRelations, Department, ComplaintCategory } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Department AI Review Queue',
};

export default async function DepartmentAiReviewPage() {
  const user = await getCurrentUser();
  const supabase = createAdminClient();

  // Find officer department if available
  let deptId: string | undefined = undefined;
  if (user) {
    const { data: officer } = await supabase
      .from('officers')
      .select('department_id')
      .eq('profile_id', user.id)
      .maybeSingle();
    deptId = officer?.department_id;
  }

  let query = supabase
    .from('complaints')
    .select(`
      *,
      department:departments(*),
      category:complaint_categories(*)
    `)
    .or('requires_manual_review.eq.true,ai_processing_status.in.(failed,manual_review)')
    .order('priority_score', { ascending: false })
    .limit(50);

  if (deptId) {
    query = query.eq('department_id', deptId);
  }

  const [complaintsRes, deptsRes, catsRes] = await Promise.all([
    query,
    supabase.from('departments').select('*').eq('is_active', true),
    supabase.from('complaint_categories').select('*').eq('is_active', true),
  ]);

  const complaints = (complaintsRes.data || []) as unknown as ComplaintWithRelations[];
  const departments = (deptsRes.data || []) as Department[];
  const categories = (catsRes.data || []) as ComplaintCategory[];

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Department Control"
      subtitle="Admin"
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Department AI Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review incoming complaints routed to your department requiring manual classification or priority confirmation.
          </p>
        </div>

        <AiReviewQueueTable
          initialComplaints={complaints}
          departments={departments}
          categories={categories}
          isAdmin={false}
        />
      </div>
    </DashboardShell>
  );
}
