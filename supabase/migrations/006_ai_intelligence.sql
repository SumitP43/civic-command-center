-- ============================================================
-- AI Civic Command Center — Phase 4: AI Intelligence Schema
-- ============================================================
-- Adds AI processing status tracking, manual review flags,
-- confidence scores, risk tracking, and admin audit corrections.
-- ============================================================

-- Create AI Processing Status enum if not exists
DO $$ BEGIN
  CREATE TYPE ai_processing_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'manual_review'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enhance complaints table with AI intelligence columns
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS ai_processing_status ai_processing_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_risk TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS manual_reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_review_notes TEXT;

-- Enhance ai_analysis table with reasoning and retry metrics
ALTER TABLE ai_analysis
  ADD COLUMN IF NOT EXISTS reasoning TEXT,
  ADD COLUMN IF NOT EXISTS risk TEXT,
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Performance indexes for AI queries and manual review queue
CREATE INDEX IF NOT EXISTS idx_complaints_ai_status ON complaints(ai_processing_status);
CREATE INDEX IF NOT EXISTS idx_complaints_manual_review ON complaints(requires_manual_review) WHERE requires_manual_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_complaints_ai_confidence ON complaints(ai_confidence);

-- Function to get complaints requiring AI manual review
CREATE OR REPLACE FUNCTION get_ai_review_queue(
  p_department_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  complaint_number TEXT,
  title TEXT,
  description TEXT,
  status complaint_status,
  ai_processing_status ai_processing_status,
  requires_manual_review BOOLEAN,
  ai_confidence FLOAT,
  ai_summary TEXT,
  ai_risk TEXT,
  ai_reasoning TEXT,
  department_id UUID,
  department_name TEXT,
  category_id UUID,
  category_name TEXT,
  severity severity_level,
  priority_score INTEGER,
  priority_level priority_level,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.complaint_number,
    c.title,
    c.description,
    c.status,
    c.ai_processing_status,
    c.requires_manual_review,
    c.ai_confidence,
    c.ai_summary,
    c.ai_risk,
    c.ai_reasoning,
    c.department_id,
    d.name AS department_name,
    c.category_id,
    cc.name AS category_name,
    c.severity,
    c.priority_score,
    c.priority_level,
    c.created_at
  FROM complaints c
  LEFT JOIN departments d ON d.id = c.department_id
  LEFT JOIN complaint_categories cc ON cc.id = c.category_id
  WHERE (c.requires_manual_review = TRUE OR c.ai_processing_status IN ('failed', 'manual_review'))
    AND (p_department_id IS NULL OR c.department_id = p_department_id)
  ORDER BY c.priority_score DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
