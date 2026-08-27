-- ============================================================
-- AI Civic Command Center — Database Functions
-- ============================================================

-- ============================================================
-- SLA DEADLINE CALCULATION
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  p_priority_level priority_level,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE p_priority_level
    WHEN 'CRITICAL' THEN RETURN p_created_at + INTERVAL '1 hour';
    WHEN 'HIGH' THEN RETURN p_created_at + INTERVAL '6 hours';
    WHEN 'MEDIUM' THEN RETURN p_created_at + INTERVAL '24 hours';
    WHEN 'LOW' THEN RETURN p_created_at + INTERVAL '72 hours';
    ELSE RETURN p_created_at + INTERVAL '72 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- PRIORITY LEVEL FROM SCORE
-- ============================================================

CREATE OR REPLACE FUNCTION priority_level_from_score(score INTEGER)
RETURNS priority_level AS $$
BEGIN
  IF score >= 90 THEN RETURN 'CRITICAL';
  ELSIF score >= 75 THEN RETURN 'HIGH';
  ELSIF score >= 50 THEN RETURN 'MEDIUM';
  ELSE RETURN 'LOW';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- UPDATE COMPLAINT PRIORITY AND SLA
-- ============================================================

CREATE OR REPLACE FUNCTION update_complaint_priority(
  p_complaint_id UUID,
  p_priority_score INTEGER
)
RETURNS void AS $$
DECLARE
  v_priority priority_level;
  v_created_at TIMESTAMPTZ;
BEGIN
  v_priority := priority_level_from_score(p_priority_score);

  SELECT created_at INTO v_created_at FROM complaints WHERE id = p_complaint_id;

  UPDATE complaints SET
    priority_score = p_priority_score,
    priority_level = v_priority,
    sla_deadline = calculate_sla_deadline(v_priority, v_created_at)
  WHERE id = p_complaint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CHECK SLA BREACHES (run periodically)
-- ============================================================

CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS TABLE(complaint_id UUID, complaint_number TEXT, department_id UUID, priority priority_level, deadline TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  UPDATE complaints
  SET sla_breached = TRUE
  WHERE sla_deadline < NOW()
    AND sla_breached = FALSE
    AND status NOT IN ('RESOLVED', 'CITIZEN_VERIFICATION', 'CLOSED')
  RETURNING id AS complaint_id, complaints.complaint_number, complaints.department_id, priority_level AS priority, sla_deadline AS deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET DASHBOARD STATISTICS
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_department_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'submitted', COUNT(*) FILTER (WHERE status = 'SUBMITTED'),
    'ai_analyzed', COUNT(*) FILTER (WHERE status = 'AI_ANALYZED'),
    'assigned', COUNT(*) FILTER (WHERE status = 'ASSIGNED'),
    'accepted', COUNT(*) FILTER (WHERE status = 'ACCEPTED'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'),
    'resolved', COUNT(*) FILTER (WHERE status = 'RESOLVED'),
    'closed', COUNT(*) FILTER (WHERE status = 'CLOSED'),
    'reopened', COUNT(*) FILTER (WHERE status = 'REOPENED'),
    'critical', COUNT(*) FILTER (WHERE priority_level = 'CRITICAL'),
    'high_priority', COUNT(*) FILTER (WHERE priority_level = 'HIGH'),
    'sla_breached', COUNT(*) FILTER (WHERE sla_breached = TRUE AND status NOT IN ('RESOLVED', 'CLOSED')),
    'avg_resolution_hours', ROUND(EXTRACT(EPOCH FROM AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL)) / 3600, 1),
    'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'this_month', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  ) INTO result
  FROM complaints
  WHERE (p_department_id IS NULL OR department_id = p_department_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- GET COMPLAINTS BY DEPARTMENT
-- ============================================================

CREATE OR REPLACE FUNCTION get_complaints_by_department()
RETURNS TABLE(department_name TEXT, department_code TEXT, total BIGINT, pending BIGINT, resolved BIGINT, sla_breached BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.name AS department_name,
    d.code AS department_code,
    COUNT(c.id) AS total,
    COUNT(c.id) FILTER (WHERE c.status NOT IN ('RESOLVED', 'CLOSED')) AS pending,
    COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')) AS resolved,
    COUNT(c.id) FILTER (WHERE c.sla_breached = TRUE AND c.status NOT IN ('RESOLVED', 'CLOSED')) AS sla_breached
  FROM departments d
  LEFT JOIN complaints c ON c.department_id = d.id
  GROUP BY d.id, d.name, d.code
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- GET COMPLAINTS OVER TIME
-- ============================================================

CREATE OR REPLACE FUNCTION get_complaints_over_time(
  p_days INTEGER DEFAULT 30,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE(date DATE, total BIGINT, resolved BIGINT, critical BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COUNT(c.id) AS total,
    COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')) AS resolved,
    COUNT(c.id) FILTER (WHERE c.priority_level = 'CRITICAL') AS critical
  FROM generate_series(
    CURRENT_DATE - (p_days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(date)
  LEFT JOIN complaints c ON DATE(c.created_at) = d.date::DATE
    AND (p_department_id IS NULL OR c.department_id = p_department_id)
  GROUP BY d.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- GET OFFICER WORKLOAD
-- ============================================================

CREATE OR REPLACE FUNCTION get_officer_workload(p_department_id UUID DEFAULT NULL)
RETURNS TABLE(
  officer_id UUID,
  officer_name TEXT,
  badge_number TEXT,
  department_name TEXT,
  active_count BIGINT,
  max_count INTEGER,
  total_resolved INTEGER,
  avg_hours FLOAT,
  officer_rating FLOAT,
  officer_status officer_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS officer_id,
    p.full_name AS officer_name,
    o.badge_number,
    d.name AS department_name,
    COUNT(ca.id) FILTER (WHERE ca.is_active = TRUE AND ca.status != 'completed') AS active_count,
    o.max_complaints AS max_count,
    o.total_resolved,
    o.avg_resolution_hours AS avg_hours,
    o.rating AS officer_rating,
    o.status AS officer_status
  FROM officers o
  JOIN profiles p ON p.id = o.profile_id
  JOIN departments d ON d.id = o.department_id
  LEFT JOIN complaint_assignments ca ON ca.officer_id = o.id
  WHERE (p_department_id IS NULL OR o.department_id = p_department_id)
  GROUP BY o.id, p.full_name, o.badge_number, d.name, o.max_complaints, o.total_resolved, o.avg_resolution_hours, o.rating, o.status
  ORDER BY active_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FIND SIMILAR COMPLAINTS (vector similarity)
-- ============================================================

CREATE OR REPLACE FUNCTION find_similar_complaints(
  query_embedding vector(768),
  similarity_threshold FLOAT DEFAULT 0.85,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(complaint_id UUID, similarity FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.complaint_id,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM complaint_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- GET CITIZEN SATISFACTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_citizen_satisfaction(p_department_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'average_rating', ROUND(AVG(f.rating)::NUMERIC, 2),
    'total_feedback', COUNT(f.id),
    'satisfaction_rate', ROUND(
      (COUNT(f.id) FILTER (WHERE f.rating >= 4)::NUMERIC / NULLIF(COUNT(f.id), 0)) * 100, 1
    ),
    'resolution_accepted_rate', ROUND(
      (COUNT(f.id) FILTER (WHERE f.is_resolution_accepted = TRUE)::NUMERIC / NULLIF(COUNT(f.id), 0)) * 100, 1
    ),
    'rating_distribution', json_build_object(
      '1', COUNT(f.id) FILTER (WHERE f.rating = 1),
      '2', COUNT(f.id) FILTER (WHERE f.rating = 2),
      '3', COUNT(f.id) FILTER (WHERE f.rating = 3),
      '4', COUNT(f.id) FILTER (WHERE f.rating = 4),
      '5', COUNT(f.id) FILTER (WHERE f.rating = 5)
    )
  ) INTO result
  FROM feedback f
  JOIN complaints c ON c.id = f.complaint_id
  WHERE (p_department_id IS NULL OR c.department_id = p_department_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE REALTIME ON KEY TABLES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE complaint_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE complaint_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
