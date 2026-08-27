import { analyzeComplaintWithGemini, type GroundingContext, type ComplaintInput } from './complaint-analysis';
import type { AiAnalysisResult } from '@/lib/validators/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENT_CODES } from '@/types';

// Fallback grounding when database fetch is unavailable
const DEFAULT_GROUNDING: GroundingContext = {
  departments: DEPARTMENT_CODES.map((code) => ({
    code,
    name: code,
  })),
  categories: [
    { name: 'Road Infrastructure', code: 'POTHOLE', departmentCode: 'PWD' },
    { name: 'Electricity', code: 'POWER_OUTAGE', departmentCode: 'ELECTRICITY' },
    { name: 'Water Supply', code: 'WATER_LEAK', departmentCode: 'WATER' },
    { name: 'Sanitation & Waste', code: 'GARBAGE', departmentCode: 'SANITATION' },
    { name: 'Roads & Signage', code: 'ROAD_DAMAGE', departmentCode: 'ROADS' },
    { name: 'Traffic Management', code: 'BROKEN_SIGNAL', departmentCode: 'TRAFFIC' },
    { name: 'Street Lighting', code: 'BROKEN_LIGHT', departmentCode: 'STREETLIGHT' },
    { name: 'Public Safety', code: 'UNSAFE_STRUCTURE', departmentCode: 'SAFETY' },
  ],
};

/**
 * Fetch live registered departments and categories for AI grounding
 */
export async function getLiveGroundingContext(): Promise<GroundingContext> {
  try {
    const supabase = createAdminClient();
    const [deptRes, catRes] = await Promise.all([
      supabase.from('departments').select('code, name').eq('is_active', true),
      supabase.from('complaint_categories').select('name, code, department_id').eq('is_active', true),
    ]);

    if (deptRes.data && deptRes.data.length > 0) {
      return {
        departments: deptRes.data,
        categories: (catRes.data || []).map((c) => ({
          name: c.name,
          code: c.code,
        })),
      };
    }
  } catch (error) {
    console.warn('Unable to load live grounding context from DB, using defaults:', error);
  }

  return DEFAULT_GROUNDING;
}

/**
 * Primary classification service wrapper used across the application.
 */
export async function classifyComplaint(
  title: string,
  description: string,
  imageAnalysis?: string,
  location?: { address?: string; landmark?: string; affectedCount?: number }
): Promise<AiAnalysisResult> {
  const grounding = await getLiveGroundingContext();

  const complaintInput: ComplaintInput = {
    title,
    description: imageAnalysis ? `${description}\n[Visual Observation: ${imageAnalysis}]` : description,
    address: location?.address,
    landmark: location?.landmark,
    affectedCount: location?.affectedCount || 1,
  };

  return await analyzeComplaintWithGemini(complaintInput, grounding);
}
