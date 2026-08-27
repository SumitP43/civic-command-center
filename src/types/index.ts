// ============================================================
// AI Civic Command Center — Application Types & Constants
// ============================================================

// Re-export all database types
export * from './database.types';

// ============================================================
// SLA Configuration
// ============================================================

export const SLA_CONFIG = {
  CRITICAL: { hours: 1, label: '1 Hour' },
  HIGH: { hours: 6, label: '6 Hours' },
  MEDIUM: { hours: 24, label: '24 Hours' },
  LOW: { hours: 72, label: '72 Hours' },
} as const;

// ============================================================
// Priority Configuration
// ============================================================

export const PRIORITY_RANGES = {
  CRITICAL: { min: 90, max: 100, color: '#EF4444', bgColor: '#FEF2F2', label: 'Critical' },
  HIGH: { min: 75, max: 89, color: '#F97316', bgColor: '#FFF7ED', label: 'High' },
  MEDIUM: { min: 50, max: 74, color: '#EAB308', bgColor: '#FEFCE8', label: 'Medium' },
  LOW: { min: 0, max: 49, color: '#22C55E', bgColor: '#F0FDF4', label: 'Low' },
} as const;

// Map marker colors matching priority
export const MARKER_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#22C55E',
} as const;

// ============================================================
// Status Configuration
// ============================================================

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  SUBMITTED: { label: 'Submitted', color: '#6B7280', bgColor: '#F3F4F6', icon: 'inbox' },
  AI_ANALYZED: { label: 'AI Analyzed', color: '#8B5CF6', bgColor: '#F5F3FF', icon: 'brain' },
  ASSIGNED: { label: 'Assigned', color: '#3B82F6', bgColor: '#EFF6FF', icon: 'user-check' },
  ACCEPTED: { label: 'Accepted', color: '#0EA5E9', bgColor: '#F0F9FF', icon: 'check-circle' },
  IN_PROGRESS: { label: 'In Progress', color: '#F59E0B', bgColor: '#FFFBEB', icon: 'loader' },
  RESOLVED: { label: 'Resolved', color: '#10B981', bgColor: '#ECFDF5', icon: 'check-circle-2' },
  CITIZEN_VERIFICATION: { label: 'Awaiting Verification', color: '#6366F1', bgColor: '#EEF2FF', icon: 'eye' },
  CLOSED: { label: 'Closed', color: '#059669', bgColor: '#D1FAE5', icon: 'lock' },
  REOPENED: { label: 'Reopened', color: '#DC2626', bgColor: '#FEF2F2', icon: 'refresh-cw' },
};

// Valid status transitions
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['AI_ANALYZED'],
  AI_ANALYZED: ['ASSIGNED'],
  ASSIGNED: ['ACCEPTED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CITIZEN_VERIFICATION', 'REOPENED'],
  CITIZEN_VERIFICATION: ['CLOSED', 'REOPENED'],
  CLOSED: [],
  REOPENED: ['IN_PROGRESS'],
};

// ============================================================
// AI Processing Status Configuration
// ============================================================

export const AI_PROCESSING_CONFIG: Record<string, { label: string; color: string; bgColor: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending AI Analysis', color: '#6B7280', bgColor: '#F3F4F6', badgeVariant: 'secondary' },
  processing: { label: 'AI Processing...', color: '#8B5CF6', bgColor: '#F5F3FF', badgeVariant: 'secondary' },
  completed: { label: 'AI Analyzed', color: '#10B981', bgColor: '#ECFDF5', badgeVariant: 'default' },
  failed: { label: 'AI Failed', color: '#EF4444', bgColor: '#FEF2F2', badgeVariant: 'destructive' },
  manual_review: { label: 'Manual Review Required', color: '#F59E0B', bgColor: '#FFFBEB', badgeVariant: 'outline' },
};

// Standardized civic risks
export const STANDARD_RISKS = [
  'Traffic Safety',
  'Public Health',
  'Electrical Hazard',
  'Flooding',
  'Water Contamination',
  'Fire Risk',
  'Accessibility Risk',
  'Environmental Risk',
  'No Immediate Risk',
  'General Infrastructure',
] as const;

export type StandardRisk = typeof STANDARD_RISKS[number];

// ============================================================
// Department Codes
// ============================================================

export const DEPARTMENT_CODES = [
  'PWD',
  'ELECTRICITY',
  'WATER',
  'SANITATION',
  'ROADS',
  'TRAFFIC',
  'STREETLIGHT',
  'SAFETY',
] as const;

export type DepartmentCode = typeof DEPARTMENT_CODES[number];

// ============================================================
// Navigation Configuration
// ============================================================

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavItem[];
}

export const CITIZEN_NAV: NavItem[] = [
  { title: 'Dashboard', href: '/citizen/dashboard', icon: 'layout-dashboard' },
  { title: 'Report Issue', href: '/citizen/report', icon: 'plus-circle' },
  { title: 'My Complaints', href: '/citizen/complaints', icon: 'file-text' },
  { title: 'Profile', href: '/citizen/profile', icon: 'user' },
];

export const OFFICER_NAV: NavItem[] = [
  { title: 'Dashboard', href: '/officer/dashboard', icon: 'layout-dashboard' },
  { title: 'Complaints', href: '/officer/complaints', icon: 'file-text' },
  { title: 'Map View', href: '/officer/map', icon: 'map' },
  { title: 'Profile', href: '/officer/profile', icon: 'user' },
];

export const DEPARTMENT_NAV: NavItem[] = [
  { title: 'Dashboard', href: '/department/dashboard', icon: 'layout-dashboard' },
  { title: 'Complaints', href: '/department/complaints', icon: 'file-text' },
  { title: 'AI Review Queue', href: '/department/ai-review', icon: 'shield' },
  { title: 'Officers', href: '/department/officers', icon: 'users' },
  { title: 'Analytics', href: '/department/analytics', icon: 'bar-chart-3' },
];

export const ADMIN_NAV: NavItem[] = [
  { title: 'Command Center', href: '/admin/dashboard', icon: 'layout-dashboard' },
  { title: 'Live City Map', href: '/admin/map', icon: 'map' },
  { title: 'Escalations Radar', href: '/admin/escalations', icon: 'alert-triangle' },
  { title: 'AI Review Queue', href: '/admin/ai-review', icon: 'brain' },
  { title: 'Department Dispatch', href: '/department/dashboard', icon: 'building-2' },
  { title: 'Analytics & Trends', href: '/department/analytics', icon: 'bar-chart-3' },
];

// ============================================================
// Pagination defaults
// ============================================================

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ============================================================
// AI Configuration
// ============================================================

export const AI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  EMBEDDING_MODEL: 'gemini-embedding-001',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.1,
  CONFIDENCE_THRESHOLD: 0.70,
  SIMILARITY_THRESHOLD: 0.85,
  MAX_DUPLICATES: 5,
} as const;

// ============================================================
// Map Configuration
// ============================================================

export const MAP_CONFIG = {
  DEFAULT_CENTER: { lng: 77.3910, lat: 28.5355 } as const, // Noida
  DEFAULT_ZOOM: 12,
  CLUSTER_RADIUS: 50,
  OSM_TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSM_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;
