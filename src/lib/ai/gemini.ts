import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG } from '@/types';

let genaiInstance: GoogleGenAI | null = null;

/**
 * Get Gemini AI client instance (server-side only).
 * Lazily initialized singleton.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!genaiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
}

/**
 * Generate text using Gemini
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  }
): Promise<string> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: AI_CONFIG.MODEL,
    contents: prompt,
    config: {
      temperature: options?.temperature ?? AI_CONFIG.TEMPERATURE,
      maxOutputTokens: options?.maxTokens ?? AI_CONFIG.MAX_TOKENS,
      systemInstruction: options?.systemInstruction,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  return text;
}

/**
 * Generate structured JSON response from Gemini
 */
export async function generateJSON<T>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  }
): Promise<T> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: AI_CONFIG.MODEL,
    contents: prompt,
    config: {
      temperature: options?.temperature ?? AI_CONFIG.TEMPERATURE,
      maxOutputTokens: options?.maxTokens ?? AI_CONFIG.MAX_TOKENS,
      responseMimeType: 'application/json',
      systemInstruction: options?.systemInstruction,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse Gemini JSON response: ${text.slice(0, 200)}`);
  }
}

/**
 * Generate embedding for text (used for duplicate detection)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();

  const response = await ai.models.embedContent({
    model: AI_CONFIG.EMBEDDING_MODEL,
    contents: text,
  });

  const res = response as unknown as {
    embedding?: { values?: number[] };
    embeddings?: { values?: number[] }[];
  };

  const values = res.embedding?.values || res.embeddings?.[0]?.values;

  if (!values) {
    throw new Error('Failed to generate embedding');
  }

  return values;
}
