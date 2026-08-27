-- ============================================================
-- AI Civic Command Center — Migration 007: Officer Assignment & Department Management
-- ============================================================

-- 1. Add unassigned_at and reassignment_reason to complaint_assignments for historical audit
ALTER TABLE complaint_assignments
  ADD COLUMN IF NOT EXISTS unassigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;

-- 2. Add specialization array and location coordinates to officers
ALTER TABLE officers
  ADD COLUMN IF NOT EXISTS specialization TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. Index for active assignments lookup
CREATE INDEX IF NOT EXISTS idx_assignments_complaint_active
  ON complaint_assignments (complaint_id, is_active);

CREATE INDEX IF NOT EXISTS idx_assignments_officer_active
  ON complaint_assignments (officer_id, is_active);

CREATE INDEX IF NOT EXISTS idx_officers_department_status
  ON officers (department_id, status);

-- 4. Storage bucket policy for resolution evidence (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution-evidence', 'resolution-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resolution-evidence
CREATE POLICY "Public Access Resolution Evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resolution-evidence');

CREATE POLICY "Officers and Admins Upload Resolution Evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resolution-evidence'
    AND auth.role() = 'authenticated'
  );

-- 5. Stored function: Get department dashboard statistics
CREATE OR REPLACE FUNCTION get_department_dashboard_stats(p_department_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INT;
  v_new INT;
  v_assigned INT;
  v_in_progress INT;
  v_resolved INT;
  v_critical INT;
  v_sla_approaching INT;
  v_sla_breached INT;
BEGIN
  -- Total
  SELECT COUNT(*) INTO v_total
  FROM complaints
  WHERE department_id = p_department_id;

  -- New (SUBMITTED or AI_ANALYZED)
  SELECT COUNT(*) INTO v_new
  FROM complaints
  WHERE department_id = p_department_id AND status IN ('SUBMITTED', 'AI_ANALYZED');

  -- Assigned / Accepted
  SELECT COUNT(*) INTO v_assigned
  FROM complaints
  WHERE department_id = p_department_id AND status IN ('ASSIGNED', 'ACCEPTED');

  -- In Progress
  SELECT COUNT(*) INTO v_in_progress
  FROM complaints
  WHERE department_id = p_department_id AND status = 'IN_PROGRESS';

  -- Resolved / Closed
  SELECT COUNT(*) INTO v_resolved
  FROM complaints
  WHERE department_id = p_department_id AND status IN ('RESOLVED', 'CLOSED', 'CITIZEN_VERIFICATION');

  -- Critical Priority
  SELECT COUNT(*) INTO v_critical
  FROM complaints
  WHERE department_id = p_department_id AND priority_level = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED');

  -- SLA Approaching (within next 12 hours)
  SELECT COUNT(*) INTO v_sla_approaching
  FROM complaints
  WHERE department_id = p_department_id
    AND status NOT IN ('RESOLVED', 'CLOSED')
    AND sla_deadline IS NOT NULL
    AND sla_deadline > NOW()
    AND sla_deadline <= (NOW() + INTERVAL '12 hours');

  -- SLA Breached
  SELECT COUNT(*) INTO v_sla_breached
  FROM complaints
  WHERE department_id = p_department_id
    AND status NOT IN ('RESOLVED', 'CLOSED')
    AND ((sla_deadline IS NOT NULL AND sla_deadline < NOW()) OR sla_breached = TRUE);

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'new', COALESCE(v_new, 0),
    'assigned', COALESCE(v_assigned, 0),
    'in_progress', COALESCE(v_in_progress, 0),
    'resolved', COALESCE(v_resolved, 0),
    'critical', COALESCE(v_critical, 0),
    'sla_approaching', COALESCE(v_sla_approaching, 0),
    'sla_breached', COALESCE(v_sla_breached, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
