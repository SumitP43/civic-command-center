import { generateEmbedding } from './gemini';
import { createAdminClient } from '@/lib/supabase/admin';
import { AI_CONFIG } from '@/types';

/**
 * Generate embedding for a complaint and find potential duplicates.
 * Uses vector similarity search in Supabase.
 */
export async function detectDuplicates(
  complaintId: string,
  title: string,
  description: string
): Promise<{
  hasDuplicates: boolean;
  duplicates: { complaint_id: string; similarity: number }[];
}> {
  try {
    // Generate embedding for the complaint text
    const text = `${title}. ${description}`;
    const embedding = await generateEmbedding(text);

    const supabase = createAdminClient();

    // Store the embedding
    await supabase.from('complaint_embeddings').upsert({
      complaint_id: complaintId,
      embedding: embedding as unknown as string, // pgvector accepts array
    });

    // Search for similar complaints (exclude self)
    const { data: similar, error } = await supabase.rpc('find_similar_complaints', {
      query_embedding: embedding as unknown as string,
      similarity_threshold: AI_CONFIG.SIMILARITY_THRESHOLD,
      match_count: AI_CONFIG.MAX_DUPLICATES,
    });

    if (error) {
      console.error('Duplicate detection error:', error);
      return { hasDuplicates: false, duplicates: [] };
    }

    // Filter out self
    const duplicates = (similar || []).filter(
      (s: { complaint_id: string; similarity: number }) => s.complaint_id !== complaintId
    );

    // If duplicates found, mark the complaint
    if (duplicates.length > 0) {
      await supabase
        .from('complaints')
        .update({ is_duplicate: true, duplicate_of: duplicates[0].complaint_id })
        .eq('id', complaintId);

      // Update AI analysis with duplicate info
      await supabase
        .from('ai_analysis')
        .update({
          duplicate_candidates: duplicates.map((d: { complaint_id: string }) => d.complaint_id),
          duplicate_similarity: duplicates.map((d: { similarity: number }) => d.similarity),
        })
        .eq('complaint_id', complaintId);
    }

    return { hasDuplicates: duplicates.length > 0, duplicates };
  } catch (error) {
    console.error('Duplicate detection failed:', error);
    return { hasDuplicates: false, duplicates: [] };
  }
}
