import { NextRequest, NextResponse } from 'next/server';
import { manualReviewAIClassification } from '@/services/ai-complaint.service';
import { createClient } from '@/lib/supabase/server';
import { manualCorrectionSchema } from '@/lib/validators/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = manualCorrectionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid correction data' },
        { status: 400 }
      );
    }

    const result = await manualReviewAIClassification(validated.data);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to submit review' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('API Manual review error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
