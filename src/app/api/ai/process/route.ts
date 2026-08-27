import { NextRequest, NextResponse } from 'next/server';
import { processComplaintAI } from '@/services/ai-complaint.service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { complaintId, forceRetry } = body;

    if (!complaintId) {
      return NextResponse.json({ error: 'complaintId is required' }, { status: 400 });
    }

    const result = await processComplaintAI(complaintId, !!forceRetry);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('API AI process error:', error);
    const message = error instanceof Error ? error.message : 'AI Processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
