-- ============================================================
-- AI Civic Command Center — Phase 6 Migration: Realtime & Escalations
-- ============================================================

-- 1. Ensure Supabase Realtime Publication covers all required tables
DO $$
BEGIN
  -- Add complaints if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'complaints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
  END IF;

  -- Add complaint_updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'complaint_updates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE complaint_updates;
  END IF;

  -- Add complaint_assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'complaint_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE complaint_assignments;
  END IF;

  -- Add notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- Add escalations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'escalations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
  END IF;
END $$;

-- 2. Stored Function: Get Super Admin Command Center Live Stats
CREATE OR REPLACE FUNCTION get_admin_command_center_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  now_ts TIMESTAMPTZ := NOW();
  next_12h_ts TIMESTAMPTZ := NOW() + INTERVAL '12 hours';
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED')),
    'critical', COUNT(*) FILTER (WHERE priority_level = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED')),
    'high', COUNT(*) FILTER (WHERE priority_level = 'HIGH' AND status NOT IN ('RESOLVED', 'CLOSED')),
    'in_progress', COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'),
    'resolved', COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')),
    'sla_approaching', COUNT(*) FILTER (
      WHERE status NOT IN ('RESOLVED', 'CLOSED')
        AND sla_deadline IS NOT NULL
        AND sla_deadline > now_ts
        AND sla_deadline <= next_12h_ts
    ),
    'sla_breached', COUNT(*) FILTER (
      WHERE status NOT IN ('RESOLVED', 'CLOSED')
        AND (sla_breached = TRUE OR (sla_deadline IS NOT NULL AND sla_deadline < now_ts))
    ),
    'escalations_pending', (SELECT COUNT(*) FROM escalations WHERE is_resolved = FALSE)
  )
  INTO result
  FROM complaints;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Stored Function: Detect Citywide Hotspots
CREATE OR REPLACE FUNCTION get_city_hotspots(
  p_min_complaints INT DEFAULT 3,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  area_name TEXT,
  center_lat NUMERIC,
  center_lon NUMERIC,
  total_complaints BIGINT,
  open_complaints BIGINT,
  resolved_complaints BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  top_category TEXT,
  recent_growth_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH valid_complaints AS (
    SELECT
      COALESCE(c.address, 'Sector ' || FLOOR(c.latitude * 10)::TEXT) AS loc_area,
      c.latitude,
      c.longitude,
      c.status,
      c.priority_level,
      c.category_id,
      cat.name AS cat_name,
      c.created_at
    FROM complaints c
    LEFT JOIN complaint_categories cat ON cat.id = c.category_id
    WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
  ),
  aggregated_areas AS (
    SELECT
      vc.loc_area AS area_name,
      AVG(vc.latitude)::NUMERIC(10, 6) AS center_lat,
      AVG(vc.longitude)::NUMERIC(10, 6) AS center_lon,
      COUNT(*) AS total_complaints,
      COUNT(*) FILTER (WHERE vc.status NOT IN ('RESOLVED', 'CLOSED')) AS open_complaints,
      COUNT(*) FILTER (WHERE vc.status IN ('RESOLVED', 'CLOSED')) AS resolved_complaints,
      COUNT(*) FILTER (WHERE vc.priority_level = 'CRITICAL') AS critical_count,
      COUNT(*) FILTER (WHERE vc.priority_level = 'HIGH') AS high_count,
      -- Top category in this area
      (
        SELECT mode() WITHIN GROUP (ORDER BY cat_name)
        FROM valid_complaints sub
        WHERE sub.loc_area = vc.loc_area
      ) AS top_category,
      -- Recent 7 days growth vs previous 7 days
      ROUND(
        (
          (COUNT(*) FILTER (WHERE vc.created_at >= NOW() - INTERVAL '7 days')::NUMERIC /
           GREATEST(1, COUNT(*) FILTER (WHERE vc.created_at >= NOW() - INTERVAL '14 days' AND vc.created_at < NOW() - INTERVAL '7 days'))::NUMERIC) - 1
        ) * 100, 1
      ) AS recent_growth_pct
    FROM valid_complaints vc
    GROUP BY vc.loc_area
    HAVING COUNT(*) >= p_min_complaints
    ORDER BY total_complaints DESC
    LIMIT p_limit
  )
  SELECT * FROM aggregated_areas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored Function: Enhanced SLA Evaluation and Multi-tier Escalation
CREATE OR REPLACE FUNCTION evaluate_and_escalate_sla()
RETURNS TABLE (
  breached_complaint_id UUID,
  complaint_number TEXT,
  escalation_created BOOLEAN,
  escalation_level escalation_level
) AS $$
DECLARE
  r RECORD;
  v_existing_esc UUID;
  v_target_level escalation_level;
  v_esc_created BOOLEAN;
BEGIN
  FOR r IN
    SELECT
      c.id,
      c.complaint_number,
      c.priority_level,
      c.department_id,
      c.sla_deadline,
      c.created_at
    FROM complaints c
    WHERE c.status NOT IN ('RESOLVED', 'CLOSED')
      AND c.sla_deadline IS NOT NULL
      AND c.sla_deadline < NOW()
  LOOP
    -- Mark complaint as SLA breached
    UPDATE complaints
    SET sla_breached = TRUE
    WHERE id = r.id AND sla_breached = FALSE;

    -- Determine target escalation level:
    -- If CRITICAL or breached for > 24 hours -> super_admin (Level 2)
    -- Else -> department_admin (Level 1)
    IF r.priority_level = 'CRITICAL' OR NOW() - r.sla_deadline > INTERVAL '24 hours' THEN
      v_target_level := 'super_admin';
    ELSE
      v_target_level := 'department_admin';
    END IF;

    -- Check if active escalation already exists for this complaint at this level
    SELECT id INTO v_existing_esc
    FROM escalations
    WHERE complaint_id = r.id AND is_resolved = FALSE AND level = v_target_level;

    IF v_existing_esc IS NULL THEN
      -- Create new escalation
      INSERT INTO escalations (
        complaint_id,
        reason,
        level,
        is_resolved
      ) VALUES (
        r.id,
        'Automatic SLA breach escalation (' || r.priority_level || ' priority)',
        v_target_level,
        FALSE
      );

      v_esc_created := TRUE;

      -- Create audit log
      INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        new_data
      ) VALUES (
        'escalation_created',
        'complaint',
        r.id,
        jsonb_build_object('level', v_target_level, 'priority', r.priority_level, 'reason', 'SLA deadline exceeded')
      );
    ELSE
      v_esc_created := FALSE;
    END IF;

    breached_complaint_id := r.id;
    complaint_number := r.complaint_number;
    escalation_created := v_esc_created;
    escalation_level := v_target_level;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
