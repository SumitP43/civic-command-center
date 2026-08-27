import { generateJSON } from './gemini';
import { aiImageAnalysisSchema, type AiImageAnalysisResult } from '@/lib/validators/ai';

/**
 * Analyze an image for civic issues using Gemini vision.
 * Note: In production, pass the image as a base64 data or a URL.
 * For now, uses text description if image can't be processed directly.
 */
export async function analyzeImage(
  imageUrl: string,
  complaintContext?: string
): Promise<AiImageAnalysisResult> {
  const prompt = `Analyze this image of a civic issue and provide:
- issueDetected: boolean - whether a civic issue is visible
- issueType: what type of civic issue (e.g., pothole, garbage dump, broken light)
- severity: LOW, MEDIUM, HIGH, or CRITICAL
- description: brief description of what you see
- additionalNotes: any safety concerns or additional observations

Image URL: ${imageUrl}
${complaintContext ? `Context: ${complaintContext}` : ''}

Analyze the image and classify the civic issue.`;

  try {
    const rawResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemInstruction: 'You are a civic infrastructure analyst. Analyze images for civic issues like potholes, broken infrastructure, garbage, flooding, etc.',
      temperature: 0.1,
    });

    const validated = aiImageAnalysisSchema.safeParse(rawResult);

    if (!validated.success) {
      return {
        issueDetected: false,
        description: 'Unable to analyze image',
      };
    }

    return validated.data;
  } catch (error) {
    console.error('Image analysis failed:', error);
    return {
      issueDetected: false,
      description: 'Image analysis unavailable',
    };
  }
}
