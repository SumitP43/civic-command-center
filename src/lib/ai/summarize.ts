import { generateText } from './gemini';

/**
 * Summarize a civic complaint into a concise overview
 */
export async function summarizeComplaint(
  title: string,
  description: string,
  updates?: { status: string; notes: string; created_at: string }[]
): Promise<string> {
  const updatesContext = updates?.length
    ? `\nStatus Updates:\n${updates.map((u) => `- [${u.status}] ${u.notes || 'No notes'} (${u.created_at})`).join('\n')}`
    : '';

  const prompt = `Summarize the following civic complaint in 2-3 concise sentences for a government dashboard:

Title: ${title}
Description: ${description}${updatesContext}

Focus on: what the issue is, where it is, how severe it is, and current status.`;

  return generateText(prompt, {
    systemInstruction: 'You are a civic administration assistant. Write clear, professional summaries for government officials.',
    temperature: 0.2,
    maxTokens: 200,
  });
}
