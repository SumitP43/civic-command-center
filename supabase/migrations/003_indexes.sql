-- ============================================================
-- AI Civic Command Center — Performance Indexes
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_city ON profiles(city);

-- Officers
CREATE INDEX idx_officers_profile_id ON officers(profile_id);
CREATE INDEX idx_officers_department_id ON officers(department_id);
CREATE INDEX idx_officers_status ON officers(status);
CREATE INDEX idx_officers_active_complaints ON officers(active_complaints);

-- Complaint Categories
CREATE INDEX idx_categories_department_id ON complaint_categories(department_id);
CREATE INDEX idx_categories_code ON complaint_categories(code);

-- Complaints
CREATE INDEX idx_complaints_citizen_id ON complaints(citizen_id);
CREATE INDEX idx_complaints_category_id ON complaints(category_id);
CREATE INDEX idx_complaints_department_id ON complaints(department_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_severity ON complaints(severity);
CREATE INDEX idx_complaints_priority_level ON complaints(priority_level);
CREATE INDEX idx_complaints_priority_score ON complaints(priority_score DESC);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_sla_breached ON complaints(sla_breached) WHERE sla_breached = TRUE;
CREATE INDEX idx_complaints_sla_deadline ON complaints(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX idx_complaints_location ON complaints USING GIST(location);
CREATE INDEX idx_complaints_status_dept ON complaints(status, department_id);
CREATE INDEX idx_complaints_number ON complaints(complaint_number);

-- Complaint Media
CREATE INDEX idx_media_complaint_id ON complaint_media(complaint_id);
CREATE INDEX idx_media_uploaded_by ON complaint_media(uploaded_by);

-- Complaint Updates
CREATE INDEX idx_updates_complaint_id ON complaint_updates(complaint_id);
CREATE INDEX idx_updates_created_at ON complaint_updates(created_at DESC);

-- Complaint Assignments
CREATE INDEX idx_assignments_complaint_id ON complaint_assignments(complaint_id);
CREATE INDEX idx_assignments_officer_id ON complaint_assignments(officer_id);
CREATE INDEX idx_assignments_active ON complaint_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_assignments_status ON complaint_assignments(status);

-- AI Analysis
CREATE INDEX idx_ai_analysis_complaint_id ON ai_analysis(complaint_id);
CREATE INDEX idx_ai_analysis_category ON ai_analysis(category);

-- Complaint Embeddings (vector index for similarity search)
CREATE INDEX idx_embeddings_complaint_id ON complaint_embeddings(complaint_id);
CREATE INDEX idx_embeddings_vector ON complaint_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Escalations
CREATE INDEX idx_escalations_complaint_id ON escalations(complaint_id);
CREATE INDEX idx_escalations_level ON escalations(level);
CREATE INDEX idx_escalations_unresolved ON escalations(is_resolved) WHERE is_resolved = FALSE;

-- Feedback
CREATE INDEX idx_feedback_complaint_id ON feedback(complaint_id);
CREATE INDEX idx_feedback_citizen_id ON feedback(citizen_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Audit Logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
