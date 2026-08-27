import { generateJSON } from './gemini';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiAssistantResponseSchema, type AiAssistantResponse } from '@/lib/validators/ai';

const ASSISTANT_SYSTEM_PROMPT = `You are an AI assistant for the AI Civic Command Center, a government civic complaint management platform.
You help administrators understand complaint data, trends, and make data-driven decisions.

CRITICAL RULES:
1. You can ONLY answer based on the data provided in the context. 
2. NEVER make up statistics, complaint numbers, or data.
3. If you don't have enough data to answer, say so clearly.
4. Be specific and reference actual numbers from the data.
5. Suggest concrete actions when appropriate.
6. Be professional and concise.

Return a JSON object with:
- answer: Your response text (markdown supported)
- sources: Array of {type, reference} indicating what data you used
- confidence: 0-1 score of how confident you are
- suggestedActions: Array of actionable next steps`;

/**
 * AI assistant that answers admin questions grounded in real database data.
 */
export async function askAssistant(
  question: string,
  userId: string
): Promise<AiAssistantResponse> {
  const supabase = createAdminClient();

  // Fetch relevant context data based on the question
  const [statsResult, deptResult, recentResult, slaResult] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_complaints_by_department'),
    supabase
      .from('complaints')
      .select('id, title, status, priority_level, severity, department_id, address, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('complaints')
      .select('id, complaint_number, status, priority_level, sla_deadline, department_id')
      .eq('sla_breached', true)
      .neq('status', 'CLOSED')
      .limit(20),
  ]);

  const context = `
DATABASE CONTEXT (these are real, current numbers):

Overall Statistics: ${JSON.stringify(statsResult.data || {})}

Department Breakdown: ${JSON.stringify(deptResult.data || [])}

Recent Complaints: ${JSON.stringify(recentResult.data || [])}

SLA Breached Complaints: ${JSON.stringify(slaResult.data || [])}
`;

  const prompt = `${context}

Admin Question: "${question}"

Answer this question based ONLY on the data above. If the data doesn't contain enough information, say so.`;

  try {
    const rawResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemInstruction: ASSISTANT_SYSTEM_PROMPT,
      temperature: 0.2,
    });

    const validated = aiAssistantResponseSchema.safeParse(rawResult);

    if (!validated.success) {
      console.error('Assistant response validation failed:', validated.error.issues);
      return {
        answer: 'I was unable to process your question. Please try rephrasing it.',
        sources: [],
        confidence: 0,
        suggestedActions: [],
      };
    }

    return validated.data;
  } catch (error) {
    console.error('AI assistant error:', error);
    return {
      answer: 'An error occurred while processing your question. Please try again.',
      sources: [],
      confidence: 0,
      suggestedActions: [],
    };
  }
}
