-- ============================================================
-- AI Civic Command Center — Row Level Security Policies
-- ============================================================

-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (Created in public schema)
-- ============================================================

-- Get user role from profiles
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if user is department_admin
CREATE OR REPLACE FUNCTION public.is_department_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'department_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Get officer's department_id
CREATE OR REPLACE FUNCTION public.officer_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM public.officers WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Super admins can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (public.is_super_admin());

-- Department admins can read profiles of officers in their department
CREATE POLICY profiles_select_dept_admin ON profiles
  FOR SELECT USING (
    public.is_department_admin() AND (
      id IN (
        SELECT o.profile_id FROM officers o
        WHERE o.department_id = public.officer_department_id()
      )
      OR role = 'citizen'
    )
  );

-- Officers can read citizen profiles for assigned complaints
CREATE POLICY profiles_select_officer ON profiles
  FOR SELECT USING (
    public.user_role() = 'officer' AND (
      id IN (
        SELECT c.citizen_id FROM complaints c
        JOIN complaint_assignments ca ON ca.complaint_id = c.id
        JOIN officers o ON o.id = ca.officer_id
        WHERE o.profile_id = auth.uid() AND ca.is_active = TRUE
      )
    )
  );

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Super admins can update any profile
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (public.is_super_admin());

-- ============================================================
-- DEPARTMENTS POLICIES
-- ============================================================

-- Everyone can read departments
CREATE POLICY departments_select_all ON departments
  FOR SELECT USING (TRUE);

-- Only super admins can modify departments
CREATE POLICY departments_insert_admin ON departments
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY departments_update_admin ON departments
  FOR UPDATE USING (public.is_super_admin());

-- ============================================================
-- OFFICERS POLICIES
-- ============================================================

-- Officers can read their own record
CREATE POLICY officers_select_own ON officers
  FOR SELECT USING (profile_id = auth.uid());

-- Department admins can read officers in their department
CREATE POLICY officers_select_dept ON officers
  FOR SELECT USING (
    public.is_department_admin() AND department_id = public.officer_department_id()
  );

-- Super admins can read all officers
CREATE POLICY officers_select_admin ON officers
  FOR SELECT USING (public.is_super_admin());

-- Super admins can manage officers
CREATE POLICY officers_insert_admin ON officers
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_department_admin());

CREATE POLICY officers_update_admin ON officers
  FOR UPDATE USING (
    public.is_super_admin()
    OR (public.is_department_admin() AND department_id = public.officer_department_id())
  );

-- ============================================================
-- COMPLAINT CATEGORIES POLICIES
-- ============================================================

-- Everyone can read categories
CREATE POLICY categories_select_all ON complaint_categories
  FOR SELECT USING (TRUE);

-- Only admins can modify
CREATE POLICY categories_modify_admin ON complaint_categories
  FOR ALL USING (public.is_super_admin());

-- ============================================================
-- COMPLAINTS POLICIES
-- ============================================================

-- Citizens can read their own complaints
CREATE POLICY complaints_select_citizen ON complaints
  FOR SELECT USING (citizen_id = auth.uid());

-- Officers can read complaints assigned to them
CREATE POLICY complaints_select_officer ON complaints
  FOR SELECT USING (
    public.user_role() = 'officer' AND id IN (
      SELECT ca.complaint_id FROM complaint_assignments ca
      JOIN officers o ON o.id = ca.officer_id
      WHERE o.profile_id = auth.uid() AND ca.is_active = TRUE
    )
  );

-- Department admins can read department complaints
CREATE POLICY complaints_select_dept ON complaints
  FOR SELECT USING (
    public.is_department_admin() AND department_id = public.officer_department_id()
  );

-- Super admins can read all complaints
CREATE POLICY complaints_select_admin ON complaints
  FOR SELECT USING (public.is_super_admin());

-- Citizens can create complaints
CREATE POLICY complaints_insert_citizen ON complaints
  FOR INSERT WITH CHECK (citizen_id = auth.uid());

-- Officers can update assigned complaints
CREATE POLICY complaints_update_officer ON complaints
  FOR UPDATE USING (
    public.user_role() = 'officer' AND id IN (
      SELECT ca.complaint_id FROM complaint_assignments ca
      JOIN officers o ON o.id = ca.officer_id
      WHERE o.profile_id = auth.uid() AND ca.is_active = TRUE
    )
  );

-- Department admins can update department complaints
CREATE POLICY complaints_update_dept ON complaints
  FOR UPDATE USING (
    public.is_department_admin() AND department_id = public.officer_department_id()
  );

-- Super admins can update all complaints
CREATE POLICY complaints_update_admin ON complaints
  FOR UPDATE USING (public.is_super_admin());

-- ============================================================
-- COMPLAINT MEDIA POLICIES
-- ============================================================

-- Media follows complaint access: visible to complaint viewers
CREATE POLICY media_select_citizen ON complaint_media
  FOR SELECT USING (
    complaint_id IN (SELECT id FROM complaints WHERE citizen_id = auth.uid())
  );

CREATE POLICY media_select_officer ON complaint_media
  FOR SELECT USING (
    public.user_role() = 'officer' AND complaint_id IN (
      SELECT ca.complaint_id FROM complaint_assignments ca
      JOIN officers o ON o.id = ca.officer_id
      WHERE o.profile_id = auth.uid() AND ca.is_active = TRUE
    )
  );

CREATE POLICY media_select_dept ON complaint_media
  FOR SELECT USING (
    public.is_department_admin() AND complaint_id IN (
      SELECT id FROM complaints WHERE department_id = public.officer_department_id()
    )
  );

CREATE POLICY media_select_admin ON complaint_media
  FOR SELECT USING (public.is_super_admin());

-- Users can upload media
CREATE POLICY media_insert ON complaint_media
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- ============================================================
-- COMPLAINT UPDATES POLICIES
-- ============================================================

CREATE POLICY updates_select_citizen ON complaint_updates
  FOR SELECT USING (
    complaint_id IN (SELECT id FROM complaints WHERE citizen_id = auth.uid())
    AND is_internal = FALSE
  );

CREATE POLICY updates_select_officer ON complaint_updates
  FOR SELECT USING (
    public.user_role() = 'officer' AND complaint_id IN (
      SELECT ca.complaint_id FROM complaint_assignments ca
      JOIN officers o ON o.id = ca.officer_id
      WHERE o.profile_id = auth.uid()
    )
  );

CREATE POLICY updates_select_dept ON complaint_updates
  FOR SELECT USING (
    public.is_department_admin() AND complaint_id IN (
      SELECT id FROM complaints WHERE department_id = public.officer_department_id()
    )
  );

CREATE POLICY updates_select_admin ON complaint_updates
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY updates_insert ON complaint_updates
  FOR INSERT WITH CHECK (updated_by = auth.uid());

-- ============================================================
-- COMPLAINT ASSIGNMENTS POLICIES
-- ============================================================

CREATE POLICY assignments_select_officer ON complaint_assignments
  FOR SELECT USING (
    officer_id IN (SELECT id FROM officers WHERE profile_id = auth.uid())
  );

CREATE POLICY assignments_select_dept ON complaint_assignments
  FOR SELECT USING (
    public.is_department_admin() AND officer_id IN (
      SELECT id FROM officers WHERE department_id = public.officer_department_id()
    )
  );

CREATE POLICY assignments_select_admin ON complaint_assignments
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY assignments_insert_dept ON complaint_assignments
  FOR INSERT WITH CHECK (
    public.is_department_admin() OR public.is_super_admin()
  );

CREATE POLICY assignments_update ON complaint_assignments
  FOR UPDATE USING (
    officer_id IN (SELECT id FROM officers WHERE profile_id = auth.uid())
    OR public.is_department_admin()
    OR public.is_super_admin()
  );

-- ============================================================
-- AI ANALYSIS POLICIES
-- ============================================================

CREATE POLICY ai_analysis_select_citizen ON ai_analysis
  FOR SELECT USING (
    complaint_id IN (SELECT id FROM complaints WHERE citizen_id = auth.uid())
  );

CREATE POLICY ai_analysis_select_officer ON ai_analysis
  FOR SELECT USING (
    public.user_role() = 'officer' AND complaint_id IN (
      SELECT ca.complaint_id FROM complaint_assignments ca
      JOIN officers o ON o.id = ca.officer_id
      WHERE o.profile_id = auth.uid()
    )
  );

CREATE POLICY ai_analysis_select_admin ON ai_analysis
  FOR SELECT USING (public.is_super_admin() OR public.is_department_admin());

-- AI analysis is inserted by server (service role), no user insert policy needed

-- ============================================================
-- COMPLAINT EMBEDDINGS POLICIES
-- ============================================================

-- Only admins and server can access embeddings
CREATE POLICY embeddings_select_admin ON complaint_embeddings
  FOR SELECT USING (public.is_super_admin());

-- ============================================================
-- ESCALATIONS POLICIES
-- ============================================================

CREATE POLICY escalations_select_dept ON escalations
  FOR SELECT USING (
    public.is_department_admin() AND complaint_id IN (
      SELECT id FROM complaints WHERE department_id = public.officer_department_id()
    )
  );

CREATE POLICY escalations_select_admin ON escalations
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY escalations_insert ON escalations
  FOR INSERT WITH CHECK (
    public.is_department_admin() OR public.is_super_admin()
  );

CREATE POLICY escalations_update ON escalations
  FOR UPDATE USING (
    public.is_department_admin() OR public.is_super_admin()
  );

-- ============================================================
-- FEEDBACK POLICIES
-- ============================================================

CREATE POLICY feedback_select_own ON feedback
  FOR SELECT USING (citizen_id = auth.uid());

CREATE POLICY feedback_select_admin ON feedback
  FOR SELECT USING (public.is_super_admin() OR public.is_department_admin());

CREATE POLICY feedback_insert_citizen ON feedback
  FOR INSERT WITH CHECK (citizen_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================

-- Only super admins can read audit logs
CREATE POLICY audit_select_admin ON audit_logs
  FOR SELECT USING (public.is_super_admin());

-- No user can insert/update/delete audit logs directly
-- They are inserted via server functions with service role
