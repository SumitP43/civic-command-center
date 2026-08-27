import { NextRequest, NextResponse } from 'next/server';
import { classifyComplaint } from '@/lib/ai/classify';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, imageAnalysis, location } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const result = await classifyComplaint(title, description, imageAnalysis, location);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('AI classification API error:', error);
    const message = error instanceof Error ? error.message : 'Classification failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
