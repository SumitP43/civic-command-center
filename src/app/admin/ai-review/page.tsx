import { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ADMIN_NAV } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { AiReviewQueueTable } from '@/components/complaints/ai-review-queue-table';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ComplaintWithRelations, Department, ComplaintCategory } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Intelligence Review Queue',
};

export default async function AdminAiReviewPage() {
  const supabase = createAdminClient();

  // Fetch complaints requiring review, departments, and categories
  const [complaintsRes, deptsRes, catsRes] = await Promise.all([
    supabase
      .from('complaints')
      .select(`
        *,
        department:departments(*),
        category:complaint_categories(*)
      `)
      .or('requires_manual_review.eq.true,ai_processing_status.in.(failed,manual_review)')
      .order('priority_score', { ascending: false })
      .limit(50),
    supabase.from('departments').select('*').eq('is_active', true),
    supabase.from('complaint_categories').select('*').eq('is_active', true),
  ]);

  const complaints = (complaintsRes.data || []) as unknown as ComplaintWithRelations[];
  const departments = (deptsRes.data || []) as Department[];
  const categories = (catsRes.data || []) as ComplaintCategory[];

  const lowConfidenceCount = complaints.filter(
    (c) => c.ai_confidence !== null && c.ai_confidence < 0.7
  ).length;
  const failedCount = complaints.filter((c) => c.ai_processing_status === 'failed').length;

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      title="City Command Center"
      subtitle="Super Admin"
      requiredRole="super_admin"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Intelligence & Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit automated Gemini AI classifications, review complaints with low confidence scores, and apply manual corrections.
          </p>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{complaints.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Low Confidence (&lt;70%)
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{lowConfidenceCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Brain className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Processing Retries
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{failedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <RefreshCw className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Queue Table */}
        <AiReviewQueueTable
          initialComplaints={complaints}
          departments={departments}
          categories={categories}
          isAdmin={true}
        />
      </div>
    </DashboardShell>
  );
}
