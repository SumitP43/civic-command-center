import { NextRequest, NextResponse } from 'next/server';
import { triggerSlaEvaluationCron } from '@/services/escalation.service';

/**
 * Endpoint for scheduled SLA evaluation cron job.
 * Executes idempotent SLA checks and creates multi-tier escalations.
 */
export async function POST(req: NextRequest) {
  try {
    // Optional secret verification
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await triggerSlaEvaluationCron();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluatedComplaints: result.evaluatedCount,
      newEscalationsCreated: result.escalatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('SLA Evaluation Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
