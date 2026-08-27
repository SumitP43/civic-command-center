import { describe, it, expect } from 'vitest';
import {
  aiAnalysisRawResponseSchema,
  aiAnalysisSchema,
  manualCorrectionSchema,
} from '../lib/validators/ai';
import { calculatePriorityScore, getPriorityLevel } from '../services/priority.service';

describe('AI Validation & Security Schema Engine', () => {
  it('should validate structured Gemini AI output correctly', () => {
    const validGeminiOutput = {
      category: 'Road Infrastructure',
      subcategory: 'Pothole',
      severity: 'HIGH',
      recommendedDepartment: 'PWD',
      confidence: 0.94,
      summary: 'Large pothole on main road creating traffic safety risk.',
      risk: 'Traffic Safety',
      reasoning: 'Pothole poses immediate vehicle damage and accident hazards on a major road.',
      riskFactors: ['Traffic Safety', 'Vehicle Damage'],
      languageDetected: 'en',
    };

    const parseResult = aiAnalysisRawResponseSchema.safeParse(validGeminiOutput);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.category).toBe('Road Infrastructure');
      expect(parseResult.data.severity).toBe('HIGH');
      expect(parseResult.data.confidence).toBe(0.94);
    }
  });

  it('should validate all 5 required Phase 4 civic complaint scenarios', () => {
    // 1. Road scenario
    const roadScenario = {
      category: 'Road Infrastructure',
      subcategory: 'Pothole',
      severity: 'HIGH' as const,
      recommendedDepartment: 'PWD',
      confidence: 0.94,
      summary: 'Large pothole near a school creating elevated traffic safety risk.',
      risk: 'Traffic Safety',
      reasoning: 'Proximity to school elevates road pothole to high safety hazard.',
      riskFactors: ['Traffic Safety', 'School Zone'],
    };
    expect(aiAnalysisRawResponseSchema.safeParse(roadScenario).success).toBe(true);
    const roadScore = calculatePriorityScore({ severity: roadScenario.severity, locationRisk: 0.8, affectedCount: 20 });
    expect(roadScore).toBeGreaterThanOrEqual(90);
    expect(getPriorityLevel(roadScore)).toBe('CRITICAL');

    // 2. Water scenario
    const waterScenario = {
      category: 'Water Supply',
      subcategory: 'Water Quality',
      severity: 'HIGH' as const,
      recommendedDepartment: 'WATER',
      confidence: 0.91,
      summary: 'Contaminated water supply reported in residential taps.',
      risk: 'Public Health',
      reasoning: 'Drinking water contamination presents immediate public health risk.',
      riskFactors: ['Public Health', 'Water Contamination'],
    };
    expect(aiAnalysisRawResponseSchema.safeParse(waterScenario).success).toBe(true);

    // 3. Electricity scenario (live wire on road)
    const electricityScenario = {
      category: 'Electricity',
      subcategory: 'Exposed Wiring',
      severity: 'CRITICAL' as const,
      recommendedDepartment: 'ELECTRICITY',
      confidence: 0.96,
      summary: 'Fallen electric pole wire on active roadway posing electrocution threat.',
      risk: 'Electrical Hazard',
      reasoning: 'Live electrical cable on public road is an immediate life hazard.',
      riskFactors: ['Electrical Hazard', 'Life Hazard'],
    };
    expect(aiAnalysisRawResponseSchema.safeParse(electricityScenario).success).toBe(true);
    const elecScore = calculatePriorityScore({ severity: electricityScenario.severity, locationRisk: 1.0 });
    expect(elecScore).toBeGreaterThanOrEqual(90);
    expect(getPriorityLevel(elecScore)).toBe('CRITICAL');

    // 4. Sanitation scenario (sewage overflow)
    const sanitationScenario = {
      category: 'Sanitation',
      subcategory: 'Sewage Overflow',
      severity: 'HIGH' as const,
      recommendedDepartment: 'SANITATION',
      confidence: 0.89,
      summary: 'Raw sewage overflowing in residential area outside homes.',
      risk: 'Public Health',
      reasoning: 'Direct biological exposure and environmental contamination.',
      riskFactors: ['Public Health', 'Biohazard'],
    };
    expect(aiAnalysisRawResponseSchema.safeParse(sanitationScenario).success).toBe(true);

    // 5. Minor issue (park bench damaged)
    const minorScenario = {
      category: 'Parks & Recreation',
      subcategory: 'Damaged Infrastructure',
      severity: 'LOW' as const,
      recommendedDepartment: 'PWD',
      confidence: 0.92,
      summary: 'Damaged wooden park bench requires carpentry repair.',
      risk: 'No Immediate Risk',
      reasoning: 'Minor cosmetic/furniture damage without public safety risk.',
      riskFactors: ['Asset Maintenance'],
    };
    expect(aiAnalysisRawResponseSchema.safeParse(minorScenario).success).toBe(true);
    const minorScore = calculatePriorityScore({ severity: minorScenario.severity, affectedCount: 1 });
    expect(minorScore).toBe(25);
    expect(getPriorityLevel(minorScore)).toBe('LOW');
  });

  it('should reject invalid severity values', () => {
    const invalidSeverityOutput = {
      category: 'Road Infrastructure',
      subcategory: 'Pothole',
      severity: 'SUPER_URGENT',
      recommendedDepartment: 'PWD',
      confidence: 0.9,
      summary: 'Pothole on road',
      risk: 'Traffic Safety',
      reasoning: 'Reason',
    };

    const parseResult = aiAnalysisRawResponseSchema.safeParse(invalidSeverityOutput);
    expect(parseResult.success).toBe(false);
  });

  it('should reject out-of-bounds confidence values', () => {
    const invalidConfidenceLow = {
      category: 'Road Infrastructure',
      subcategory: 'Pothole',
      severity: 'HIGH',
      recommendedDepartment: 'PWD',
      confidence: -0.5,
      summary: 'Summary text',
      risk: 'Risk',
      reasoning: 'Reason',
    };

    const invalidConfidenceHigh = {
      ...invalidConfidenceLow,
      confidence: 1.5,
    };

    expect(aiAnalysisRawResponseSchema.safeParse(invalidConfidenceLow).success).toBe(false);
    expect(aiAnalysisRawResponseSchema.safeParse(invalidConfidenceHigh).success).toBe(false);
  });

  it('should validate normalized AI analysis result schema', () => {
    const validAnalysis = {
      category: 'Water Supply',
      subcategory: 'Water Quality',
      severity: 'HIGH' as const,
      priorityScore: 82,
      priorityLevel: 'HIGH' as const,
      recommendedDepartment: 'WATER',
      confidence: 0.88,
      summary: 'Yellow contaminated tap water reported in residential area.',
      risk: 'Public Health',
      reasoning: 'Contaminated drinking water creates direct health hazards.',
      requiresManualReview: false,
      riskFactors: ['Public Health', 'Water Contamination'],
      languageDetected: 'en',
    };

    const result = aiAnalysisSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it('should validate admin manual review corrections with valid UUID', () => {
    const validCorrection = {
      complaintId: '123e4567-e89b-12d3-a456-426614174000',
      departmentId: '123e4567-e89b-12d3-a456-426614174001',
      severity: 'HIGH' as const,
      priorityScore: 85,
      notes: 'Manually verified by super admin. Priority adjusted to 85.',
    };

    const parseResult = manualCorrectionSchema.safeParse(validCorrection);
    expect(parseResult.success).toBe(true);

    const invalidCorrection = {
      complaintId: 'invalid-not-a-uuid',
      priorityScore: 150,
    };

    expect(manualCorrectionSchema.safeParse(invalidCorrection).success).toBe(false);
  });
});
