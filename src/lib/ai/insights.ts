import { generateJSON } from './gemini';
import { aiInsightSchema, type AiInsightResult } from '@/lib/validators/ai';
import type { DashboardStats, ComplaintsByDepartment } from '@/types';

const INSIGHTS_SYSTEM_PROMPT = `You are an AI analytics assistant for a civic complaint management system in India.
You analyze real complaint data and generate actionable insights for government administrators.

CRITICAL RULES:
1. ONLY reference data that is explicitly provided to you. Never invent statistics.
2. Base all insights on the actual numbers provided.
3. Provide specific, actionable recommendations.
4. Highlight concerning trends and areas needing attention.
5. Be concise and professional.

Return a JSON object with an "insights" array, where each insight has:
- title: Short insight title
- description: Detailed explanation with specific numbers
- type: One of "trend", "alert", "recommendation", "anomaly"
- severity: One of "info", "warning", "critical"
- metric: The key metric being discussed (optional)
- change: Percentage change if applicable (optional)
- relatedDepartment: Department code if specific to one (optional)
- relatedArea: Geographic area if specific (optional)`;

/**
 * Generate AI insights from real dashboard data.
 * Grounded in actual database statistics — never invents facts.
 */
export async function generateInsights(
  stats: DashboardStats,
  departmentStats: ComplaintsByDepartment[],
  recentTrends?: { date: string; total: number; resolved: number }[]
): Promise<AiInsightResult> {
  const prompt = `Analyze the following civic complaint data and generate insights:

OVERALL STATISTICS:
- Total complaints: ${stats.total}
- Pending: ${stats.submitted + stats.ai_analyzed + stats.assigned}
- In Progress: ${stats.in_progress}
- Resolved: ${stats.resolved}
- Closed: ${stats.closed}
- Critical priority: ${stats.critical}
- SLA breached: ${stats.sla_breached}
- Average resolution time: ${stats.avg_resolution_hours ?? 'N/A'} hours
- Complaints today: ${stats.today}
- Complaints this week: ${stats.this_week}
- Complaints this month: ${stats.this_month}

DEPARTMENT BREAKDOWN:
${departmentStats.map((d) => `- ${d.department_name} (${d.department_code}): ${d.total} total, ${d.pending} pending, ${d.resolved} resolved, ${d.sla_breached} SLA breached`).join('\n')}

${recentTrends ? `DAILY TREND (last 7 days):\n${recentTrends.slice(-7).map((t) => `- ${t.date}: ${t.total} new, ${t.resolved} resolved`).join('\n')}` : ''}

Generate 4-6 actionable insights based ONLY on the data above.`;

  try {
    const rawResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemInstruction: INSIGHTS_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    const validated = aiInsightSchema.safeParse(rawResult);

    if (!validated.success) {
      console.error('AI insights validation failed:', validated.error.issues);
      return { insights: [] };
    }

    return validated.data;
  } catch (error) {
    console.error('AI insights generation failed:', error);
    return { insights: [] };
  }
}
