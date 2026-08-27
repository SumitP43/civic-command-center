-- ============================================================
-- AI Civic Command Center — Initial Database Schema
-- ============================================================
-- Run this in Supabase SQL Editor or via CLI migration.
-- Prerequisites: Enable pgvector and PostGIS extensions first.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'department_admin', 'super_admin');

CREATE TYPE complaint_status AS ENUM (
  'SUBMITTED',
  'AI_ANALYZED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'RESOLVED',
  'CITIZEN_VERIFICATION',
  'CLOSED',
  'REOPENED'
);

CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE officer_status AS ENUM ('available', 'busy', 'on_leave', 'inactive');

CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');

CREATE TYPE media_type AS ENUM ('image', 'video', 'document');

CREATE TYPE notification_type AS ENUM (
  'complaint_created',
  'complaint_assigned',
  'complaint_accepted',
  'status_changed',
  'complaint_resolved',
  'complaint_closed',
  'complaint_reopened',
  'sla_warning',
  'sla_breached',
  'escalation',
  'new_feedback',
  'system'
);

CREATE TYPE escalation_level AS ENUM ('department_admin', 'super_admin');

CREATE TYPE audit_action AS ENUM (
  'complaint_created',
  'complaint_assigned',
  'status_changed',
  'complaint_reopened',
  'evidence_uploaded',
  'complaint_resolved',
  'complaint_closed',
  'escalation_created',
  'admin_change',
  'officer_assigned',
  'officer_unassigned',
  'feedback_submitted',
  'profile_updated'
);

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'citizen',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  city TEXT DEFAULT 'Noida',
  state TEXT DEFAULT 'Uttar Pradesh',
  pincode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  head_officer_id UUID,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Officers
CREATE TABLE officers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  badge_number TEXT UNIQUE,
  designation TEXT,
  status officer_status NOT NULL DEFAULT 'available',
  active_complaints INTEGER NOT NULL DEFAULT 0,
  max_complaints INTEGER NOT NULL DEFAULT 10,
  total_resolved INTEGER NOT NULL DEFAULT 0,
  avg_resolution_hours FLOAT DEFAULT 0,
  rating FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Add FK from departments.head_officer_id to officers.id (deferred)
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head_officer
  FOREIGN KEY (head_officer_id) REFERENCES officers(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- 4. Complaint Categories
CREATE TABLE complaint_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Complaints
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number TEXT NOT NULL UNIQUE,
  citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES complaint_categories(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  landmark TEXT,
  status complaint_status NOT NULL DEFAULT 'SUBMITTED',
  severity severity_level,
  priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_level priority_level,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES complaints(id) ON DELETE SET NULL,
  affected_count INTEGER DEFAULT 1,
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generate complaint number automatically
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_val FROM complaints;
  NEW.complaint_number := 'CIV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_number
  BEFORE INSERT ON complaints
  FOR EACH ROW
  WHEN (NEW.complaint_number IS NULL OR NEW.complaint_number = '')
  EXECUTE FUNCTION generate_complaint_number();

-- 6. Complaint Media
CREATE TABLE complaint_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  media_type media_type NOT NULL DEFAULT 'image',
  is_resolution_evidence BOOLEAN DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Complaint Updates (status change log)
CREATE TABLE complaint_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  previous_status complaint_status,
  new_status complaint_status NOT NULL,
  notes TEXT,
  updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Complaint Assignments
CREATE TABLE complaint_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AI Analysis
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE UNIQUE,
  raw_response JSONB,
  category TEXT,
  subcategory TEXT,
  severity severity_level,
  priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
  department_recommendation TEXT,
  summary TEXT,
  risk_factors TEXT[],
  language_detected TEXT,
  original_language_text TEXT,
  translated_text TEXT,
  image_analysis TEXT,
  duplicate_candidates UUID[],
  duplicate_similarity FLOAT[],
  confidence_score FLOAT,
  processing_time_ms INTEGER,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Complaint Embeddings (for vector similarity / duplicate detection)
CREATE TABLE complaint_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE UNIQUE,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Escalations
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  escalated_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  level escalation_level NOT NULL DEFAULT 'department_admin',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_resolution_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(complaint_id, citizen_id)
);

-- 13. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_officers_updated_at BEFORE UPDATE ON officers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_complaint_categories_updated_at BEFORE UPDATE ON complaint_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_complaint_assignments_updated_at BEFORE UPDATE ON complaint_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_escalations_updated_at BEFORE UPDATE ON escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
