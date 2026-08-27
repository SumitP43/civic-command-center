import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/ai/insights';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin or department admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'department_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get dashboard stats
    const { data: stats } = await supabase.rpc('get_dashboard_stats');
    const { data: deptStats } = await supabase.rpc('get_complaints_by_department');
    const { data: trends } = await supabase.rpc('get_complaints_over_time', { p_days: 7 });

    if (!stats || !deptStats) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const insights = await generateInsights(stats, deptStats, trends || undefined);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('AI insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
