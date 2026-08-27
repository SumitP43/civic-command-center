// ============================================================
// AI Civic Command Center — Database Types
// ============================================================
// These types mirror the Supabase database schema.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'citizen' | 'officer' | 'department_admin' | 'super_admin';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CITIZEN_VERIFICATION'
  | 'CLOSED'
  | 'REOPENED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OfficerStatus = 'available' | 'busy' | 'on_leave' | 'inactive';

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export type MediaType = 'image' | 'video' | 'document';

export type NotificationType =
  | 'complaint_created'
  | 'complaint_assigned'
  | 'complaint_accepted'
  | 'status_changed'
  | 'complaint_resolved'
  | 'complaint_closed'
  | 'complaint_reopened'
  | 'sla_warning'
  | 'sla_breached'
  | 'escalation'
  | 'new_feedback'
  | 'system';

export type EscalationLevel = 'department_admin' | 'super_admin';

export type AuditAction =
  | 'complaint_created'
  | 'complaint_assigned'
  | 'status_changed'
  | 'complaint_reopened'
  | 'evidence_uploaded'
  | 'complaint_resolved'
  | 'complaint_closed'
  | 'escalation_created'
  | 'admin_change'
  | 'officer_assigned'
  | 'officer_unassigned'
  | 'feedback_submitted'
  | 'profile_updated';

export type AiProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'manual_review';

// ============================================================
// Table Row Types
// ============================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_officer_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Officer {
  id: string;
  profile_id: string;
  department_id: string;
  badge_number: string | null;
  designation: string | null;
  status: OfficerStatus;
  specialization?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  active_complaints: number;
  max_complaints: number;
  total_resolved: number;
  avg_resolution_hours: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ComplaintCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  category_id: string | null;
  department_id: string | null;
  title: string;
  description: string;
  location: unknown | null;
  address: string | null;
  landmark: string | null;
  status: ComplaintStatus;
  severity: SeverityLevel | null;
  priority_score: number;
  priority_level: PriorityLevel | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  affected_count: number;
  sla_deadline: string | null;
  sla_breached: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  ai_processing_status: AiProcessingStatus;
  requires_manual_review: boolean;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_risk: string | null;
  ai_reasoning: string | null;
  manual_reviewed_by: string | null;
  manual_reviewed_at: string | null;
  manual_review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintMedia {
  id: string;
  complaint_id: string;
  url: string;
  file_name: string | null;
  file_size: number | null;
  media_type: MediaType;
  is_resolution_evidence: boolean;
  uploaded_by: string;
  caption: string | null;
  created_at: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  previous_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  notes: string | null;
  updated_by: string;
  is_internal: boolean;
  created_at: string;
}

export interface ComplaintAssignment {
  id: string;
  complaint_id: string;
  officer_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  unassigned_at?: string | null;
  reassignment_reason?: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiAnalysis {
  id: string;
  complaint_id: string;
  raw_response: Json | null;
  category: string | null;
  subcategory: string | null;
  severity: SeverityLevel | null;
  priority_score: number | null;
  department_recommendation: string | null;
  summary: string | null;
  risk: string | null;
  reasoning: string | null;
  risk_factors: string[] | null;
  language_detected: string | null;
  original_language_text: string | null;
  translated_text: string | null;
  image_analysis: string | null;
  duplicate_candidates: string[] | null;
  duplicate_similarity: number[] | null;
  confidence_score: number | null;
  requires_manual_review: boolean;
  retry_count: number;
  error_message: string | null;
  processing_time_ms: number | null;
  model_version: string | null;
  created_at: string;
}

export interface ComplaintEmbedding {
  id: string;
  complaint_id: string;
  embedding: number[] | null;
  created_at: string;
}

export interface Escalation {
  id: string;
  complaint_id: string;
  reason: string;
  escalated_by: string | null;
  escalated_to: string | null;
  level: EscalationLevel;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  complaint_id: string;
  citizen_id: string;
  rating: number;
  comment: string | null;
  is_resolution_accepted: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  complaint_id: string | null;
  action_url: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================
// Join / Extended Types
// ============================================================

export interface ComplaintWithRelations extends Complaint {
  citizen?: Profile;
  category?: ComplaintCategory;
  department?: Department;
  media?: ComplaintMedia[];
  updates?: ComplaintUpdate[];
  assignments?: (ComplaintAssignment & { officer?: Officer & { profile?: Profile } })[];
  ai_analysis?: AiAnalysis;
  feedback?: Feedback[];
  escalations?: Escalation[];
}

export interface OfficerWithProfile extends Officer {
  profile: Profile;
  department: Department;
}

export interface DashboardStats {
  total: number;
  submitted: number;
  ai_analyzed: number;
  assigned: number;
  accepted: number;
  in_progress: number;
  resolved: number;
  closed: number;
  reopened: number;
  critical: number;
  high_priority: number;
  sla_breached: number;
  avg_resolution_hours: number | null;
  today: number;
  this_week: number;
  this_month: number;
}

export interface OfficerWorkload {
  officer_id: string;
  officer_name: string;
  badge_number: string | null;
  department_name: string;
  active_count: number;
  max_count: number;
  total_resolved: number;
  avg_hours: number;
  officer_rating: number;
  officer_status: OfficerStatus;
}

export interface CitizenSatisfaction {
  average_rating: number;
  total_feedback: number;
  satisfaction_rate: number;
  resolution_accepted_rate: number;
  rating_distribution: Record<string, number>;
}

export interface ComplaintsByDepartment {
  department_name: string;
  department_code: string;
  total: number;
  pending: number;
  resolved: number;
  sla_breached: number;
}

export interface ComplaintsOverTime {
  date: string;
  total: number;
  resolved: number;
  critical: number;
}

export interface AiReviewQueueItem {
  id: string;
  complaint_number: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  ai_processing_status: AiProcessingStatus;
  requires_manual_review: boolean;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_risk: string | null;
  ai_reasoning: string | null;
  department_id: string | null;
  department_name: string | null;
  category_id: string | null;
  category_name: string | null;
  severity: SeverityLevel | null;
  priority_score: number;
  priority_level: PriorityLevel | null;
  created_at: string;
}

// Relationship shape required by Supabase postgrest-js
export type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

// ============================================================
// Database type helper for Supabase client
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      departments: {
        Row: Department;
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          head_officer_id?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          head_officer_id?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      officers: {
        Row: Officer;
        Insert: {
          id?: string;
          profile_id: string;
          department_id: string;
          badge_number?: string | null;
          designation?: string | null;
          status?: OfficerStatus;
          active_complaints?: number;
          max_complaints?: number;
          total_resolved?: number;
          avg_resolution_hours?: number;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          department_id?: string;
          badge_number?: string | null;
          designation?: string | null;
          status?: OfficerStatus;
          active_complaints?: number;
          max_complaints?: number;
          total_resolved?: number;
          avg_resolution_hours?: number;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      complaint_categories: {
        Row: ComplaintCategory;
        Insert: {
          id?: string;
          name: string;
          code: string;
          department_id: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          department_id?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      complaints: {
        Row: Complaint;
        Insert: {
          id?: string;
          complaint_number?: string;
          citizen_id: string;
          title: string;
          description: string;
          category_id?: string | null;
          department_id?: string | null;
          location?: unknown | null;
          address?: string | null;
          landmark?: string | null;
          status?: ComplaintStatus;
          severity?: SeverityLevel | null;
          priority_score?: number;
          priority_level?: PriorityLevel | null;
          is_duplicate?: boolean;
          duplicate_of?: string | null;
          affected_count?: number;
          sla_deadline?: string | null;
          sla_breached?: boolean;
          resolved_at?: string | null;
          closed_at?: string | null;
          ai_processing_status?: AiProcessingStatus;
          requires_manual_review?: boolean;
          ai_confidence?: number | null;
          ai_summary?: string | null;
          ai_risk?: string | null;
          ai_reasoning?: string | null;
          manual_reviewed_by?: string | null;
          manual_reviewed_at?: string | null;
          manual_review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          complaint_number?: string;
          citizen_id?: string;
          title?: string;
          description?: string;
          category_id?: string | null;
          department_id?: string | null;
          location?: unknown | null;
          address?: string | null;
          landmark?: string | null;
          status?: ComplaintStatus;
          severity?: SeverityLevel | null;
          priority_score?: number;
          priority_level?: PriorityLevel | null;
          is_duplicate?: boolean;
          duplicate_of?: string | null;
          affected_count?: number;
          sla_deadline?: string | null;
          sla_breached?: boolean;
          resolved_at?: string | null;
          closed_at?: string | null;
          ai_processing_status?: AiProcessingStatus;
          requires_manual_review?: boolean;
          ai_confidence?: number | null;
          ai_summary?: string | null;
          ai_risk?: string | null;
          ai_reasoning?: string | null;
          manual_reviewed_by?: string | null;
          manual_reviewed_at?: string | null;
          manual_review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      complaint_media: {
        Row: ComplaintMedia;
        Insert: {
          id?: string;
          complaint_id: string;
          url: string;
          uploaded_by: string;
          file_name?: string | null;
          file_size?: number | null;
          media_type?: MediaType;
          is_resolution_evidence?: boolean;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          url?: string;
          uploaded_by?: string;
          file_name?: string | null;
          file_size?: number | null;
          media_type?: MediaType;
          is_resolution_evidence?: boolean;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      complaint_updates: {
        Row: ComplaintUpdate;
        Insert: {
          id?: string;
          complaint_id: string;
          new_status: ComplaintStatus;
          updated_by: string;
          previous_status?: ComplaintStatus | null;
          notes?: string | null;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          new_status?: ComplaintStatus;
          updated_by?: string;
          previous_status?: ComplaintStatus | null;
          notes?: string | null;
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      complaint_assignments: {
        Row: ComplaintAssignment;
        Insert: {
          id?: string;
          complaint_id: string;
          officer_id: string;
          assigned_by: string;
          status?: AssignmentStatus;
          assigned_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          officer_id?: string;
          assigned_by?: string;
          status?: AssignmentStatus;
          assigned_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      ai_analysis: {
        Row: AiAnalysis;
        Insert: {
          id?: string;
          complaint_id: string;
          raw_response?: Json | null;
          category?: string | null;
          subcategory?: string | null;
          severity?: SeverityLevel | null;
          priority_score?: number | null;
          department_recommendation?: string | null;
          summary?: string | null;
          risk?: string | null;
          reasoning?: string | null;
          risk_factors?: string[] | null;
          language_detected?: string | null;
          original_language_text?: string | null;
          translated_text?: string | null;
          image_analysis?: string | null;
          duplicate_candidates?: string[] | null;
          duplicate_similarity?: number[] | null;
          confidence_score?: number | null;
          requires_manual_review?: boolean;
          retry_count?: number;
          error_message?: string | null;
          processing_time_ms?: number | null;
          model_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          raw_response?: Json | null;
          category?: string | null;
          subcategory?: string | null;
          severity?: SeverityLevel | null;
          priority_score?: number | null;
          department_recommendation?: string | null;
          summary?: string | null;
          risk?: string | null;
          reasoning?: string | null;
          risk_factors?: string[] | null;
          language_detected?: string | null;
          original_language_text?: string | null;
          translated_text?: string | null;
          image_analysis?: string | null;
          duplicate_candidates?: string[] | null;
          duplicate_similarity?: number[] | null;
          confidence_score?: number | null;
          requires_manual_review?: boolean;
          retry_count?: number;
          error_message?: string | null;
          processing_time_ms?: number | null;
          model_version?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      complaint_embeddings: {
        Row: ComplaintEmbedding;
        Insert: {
          id?: string;
          complaint_id: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      escalations: {
        Row: Escalation;
        Insert: {
          id?: string;
          complaint_id: string;
          reason: string;
          escalated_by?: string | null;
          escalated_to?: string | null;
          level?: EscalationLevel;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          reason?: string;
          escalated_by?: string | null;
          escalated_to?: string | null;
          level?: EscalationLevel;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      feedback: {
        Row: Feedback;
        Insert: {
          id?: string;
          complaint_id: string;
          citizen_id: string;
          rating: number;
          comment?: string | null;
          is_resolution_accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          citizen_id?: string;
          rating?: number;
          comment?: string | null;
          is_resolution_accepted?: boolean;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      notifications: {
        Row: Notification;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: NotificationType;
          read?: boolean;
          complaint_id?: string | null;
          action_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: NotificationType;
          read?: boolean;
          complaint_id?: string | null;
          action_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: {
          id?: string;
          user_id?: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: AuditAction;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_stats: {
        Args: { p_department_id?: string };
        Returns: DashboardStats;
      };
      get_complaints_by_department: {
        Args: Record<string, never>;
        Returns: ComplaintsByDepartment[];
      };
      get_complaints_over_time: {
        Args: { p_days?: number; p_department_id?: string };
        Returns: ComplaintsOverTime[];
      };
      get_officer_workload: {
        Args: { p_department_id?: string };
        Returns: OfficerWorkload[];
      };
      get_citizen_satisfaction: {
        Args: { p_department_id?: string };
        Returns: CitizenSatisfaction;
      };
      find_similar_complaints: {
        Args: { query_embedding: number[]; similarity_threshold?: number; match_count?: number };
        Returns: { complaint_id: string; similarity: number }[];
      };
      check_sla_breaches: {
        Args: Record<string, never>;
        Returns: { complaint_id: string; complaint_number: string; department_id: string; priority: PriorityLevel; deadline: string }[];
      };
      get_ai_review_queue: {
        Args: { p_department_id?: string; p_limit?: number; p_offset?: number };
        Returns: AiReviewQueueItem[];
      };
    };
    Enums: {
      user_role: UserRole;
      complaint_status: ComplaintStatus;
      severity_level: SeverityLevel;
      priority_level: PriorityLevel;
      officer_status: OfficerStatus;
      assignment_status: AssignmentStatus;
      media_type: MediaType;
      notification_type: NotificationType;
      escalation_level: EscalationLevel;
      audit_action: AuditAction;
      ai_processing_status: AiProcessingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
