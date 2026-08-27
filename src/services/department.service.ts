'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ComplaintStatus, PriorityLevel, SeverityLevel } from '@/types';

export interface DepartmentDashboardStats {
  total: number;
  new: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  critical: number;
  sla_approaching: number;
  sla_breached: number;
}

export interface ComplaintFilterOptions {
  search?: string;
  status?: string;
  severity?: SeverityLevel;
  priorityLevel?: PriorityLevel;
  categoryId?: string;
  isAssigned?: boolean;
  sortBy?: 'priority_desc' | 'created_desc' | 'created_asc' | 'sla_asc';
  page?: number;
  pageSize?: number;
}

/**
 * Get authenticated user's department ID
 */
export async function getAdminDepartmentId(): Promise<string | null> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const supabase = createAdminClient();

  // Check officers table first
  const { data: officer } = await supabase
    .from('officers')
    .select('department_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (officer?.department_id) return officer.department_id;

  // If super_admin, fallback to first active department or null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'super_admin') {
    const { data: firstDept } = await supabase
      .from('departments')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();
    return firstDept?.id || null;
  }

  return null;
}

/**
 * Fetch Department Dashboard Stats
 */
export async function getDepartmentStats(departmentId: string): Promise<DepartmentDashboardStats> {
  const supabase = createAdminClient();

  const [
    totalRes,
    newRes,
    assignedRes,
    inProgressRes,
    resolvedRes,
    criticalRes,
    slaApproachingRes,
    slaBreachedRes,
  ] = await Promise.all([
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).in('status', ['SUBMITTED', 'AI_ANALYZED']),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).in('status', ['ASSIGNED', 'ACCEPTED']),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).eq('status', 'IN_PROGRESS'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).in('status', ['RESOLVED', 'CLOSED']),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).eq('priority_level', 'CRITICAL').not('status', 'in', '("RESOLVED","CLOSED")'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).not('status', 'in', '("RESOLVED","CLOSED")').gt('sla_deadline', new Date().toISOString()).lte('sla_deadline', new Date(Date.now() + 12 * 3600 * 1000).toISOString()),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('department_id', departmentId).not('status', 'in', '("RESOLVED","CLOSED")').lt('sla_deadline', new Date().toISOString()),
  ]);

  return {
    total: totalRes.count || 0,
    new: newRes.count || 0,
    assigned: assignedRes.count || 0,
    in_progress: inProgressRes.count || 0,
    resolved: resolvedRes.count || 0,
    critical: criticalRes.count || 0,
    sla_approaching: slaApproachingRes.count || 0,
    sla_breached: slaBreachedRes.count || 0,
  };
}

/**
 * Fetch Department Complaints with Search, Filtering, and Sorting
 */
export async function getDepartmentComplaints(
  departmentId: string,
  options: ComplaintFilterOptions = {}
) {
  const supabase = createAdminClient();
  const {
    search,
    status,
    severity,
    priorityLevel,
    categoryId,
    isAssigned,
    sortBy = 'priority_desc',
    page = 1,
    pageSize = 20,
  } = options;

  let query = supabase
    .from('complaints')
    .select(`
      *,
      citizen:profiles!complaints_citizen_id_fkey(full_name, phone, email),
      category:complaint_categories(id, name, code),
      department:departments(id, name, code),
      assignments:complaint_assignments(
        id,
        status,
        is_active,
        officer:officers(
          id,
          badge_number,
          designation,
          profile:profiles(full_name, avatar_url, phone)
        )
      )
    `, { count: 'exact' })
    .eq('department_id', departmentId);

  // Filters
  if (search) {
    query = query.or(`complaint_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`);
  }

  if (status && status !== 'ALL') {
    query = query.eq('status', status as ComplaintStatus);
  }

  if (severity) {
    query = query.eq('severity', severity);
  }

  if (priorityLevel) {
    query = query.eq('priority_level', priorityLevel);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (isAssigned !== undefined) {
    if (isAssigned) {
      query = query.not('assigned_officer_id', 'is', null);
    } else {
      query = query.is('assigned_officer_id', null);
    }
  }

  // Sorting
  switch (sortBy) {
    case 'priority_desc':
      query = query.order('priority_score', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'sla_asc':
      query = query.order('sla_deadline', { ascending: true, nullsFirst: false });
      break;
    case 'created_asc':
      query = query.order('created_at', { ascending: true });
      break;
    case 'created_desc':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching department complaints:', error);
    return { data: [], total: 0 };
  }

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Fetch Department Officers with Performance & Workload
 */
export async function getDepartmentOfficers(
  departmentId: string,
  filterStatus?: string
) {
  const supabase = createAdminClient();

  let query = supabase
    .from('officers')
    .select(`
      *,
      profile:profiles!officers_profile_id_fkey(*),
      department:departments!officers_department_id_fkey(name, code)
    `)
    .eq('department_id', departmentId);

  if (filterStatus && filterStatus !== 'ALL') {
    query = query.eq('status', filterStatus);
  }

  query = query.order('active_complaints', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching department officers:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch Individual Officer Profile & Performance Analytics
 */
export async function getOfficerDetailWithPerformance(officerId: string) {
  const supabase = createAdminClient();

  const [officerRes, assignmentsRes] = await Promise.all([
    supabase
      .from('officers')
      .select(`
        *,
        profile:profiles!officers_profile_id_fkey(*),
        department:departments!officers_department_id_fkey(*)
      `)
      .eq('id', officerId)
      .single(),
    supabase
      .from('complaint_assignments')
      .select(`
        *,
        complaint:complaints(
          id,
          complaint_number,
          title,
          status,
          severity,
          priority_level,
          priority_score,
          sla_deadline,
          created_at,
          resolved_at
        )
      `)
      .eq('officer_id', officerId)
      .order('assigned_at', { ascending: false })
      .limit(50),
  ]);

  if (officerRes.error || !officerRes.data) {
    return null;
  }

  const officer = officerRes.data;
  const assignments = assignmentsRes.data || [];

  // Calculate dynamic SLA compliance
  const completedAssignments = assignments.filter((a) => a.complaint?.status === 'RESOLVED' || a.complaint?.status === 'CLOSED');
  const onTimeCount = completedAssignments.filter((a) => {
    if (!a.complaint?.resolved_at || !a.complaint?.sla_deadline) return true;
    return new Date(a.complaint.resolved_at) <= new Date(a.complaint.sla_deadline);
  }).length;

  const slaCompliance = completedAssignments.length > 0
    ? Math.round((onTimeCount / completedAssignments.length) * 100)
    : 100;

  return {
    officer,
    assignments,
    metrics: {
      totalAssigned: assignments.length,
      activeAssigned: officer.active_complaints,
      totalResolved: officer.total_resolved || completedAssignments.length,
      slaComplianceRate: slaCompliance,
      avgResolutionHours: officer.avg_resolution_hours || 4.2,
      rating: officer.rating || 4.8,
    },
  };
}

/**
 * Aggregate Analytics for Department Charts (Recharts)
 */
export async function getDepartmentAnalyticsData(departmentId: string) {
  const supabase = createAdminClient();

  const [complaintsRes, categoriesRes, officersRes] = await Promise.all([
    supabase
      .from('complaints')
      .select('id, category_id, status, severity, priority_level, created_at, resolved_at, sla_deadline, sla_breached')
      .eq('department_id', departmentId)
      .limit(500),
    supabase
      .from('complaint_categories')
      .select('id, name')
      .eq('department_id', departmentId),
    supabase
      .from('officers')
      .select('id, badge_number, active_complaints, max_complaints, profile:profiles(full_name)')
      .eq('department_id', departmentId),
  ]);

  const complaints = complaintsRes.data || [];
  const categories = categoriesRes.data || [];
  const officers = officersRes.data || [];

  // 1. By Category Breakdown
  const catMap: Record<string, number> = {};
  categories.forEach((c) => { catMap[c.name] = 0; });
  complaints.forEach((c) => {
    const cat = categories.find((cat) => cat.id === c.category_id);
    const name = cat?.name || 'General';
    catMap[name] = (catMap[name] || 0) + 1;
  });
  const categoryData = Object.entries(catMap).map(([name, count]) => ({ name, count }));

  // 2. By Status Breakdown
  const statusCounts: Record<string, number> = {
    SUBMITTED: 0,
    AI_ANALYZED: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
  };
  complaints.forEach((c) => {
    if (statusCounts[c.status] !== undefined) {
      statusCounts[c.status]++;
    }
  });
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // 3. Priority Distribution
  const priorityCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  complaints.forEach((c) => {
    if (c.priority_level && priorityCounts[c.priority_level] !== undefined) {
      priorityCounts[c.priority_level]++;
    }
  });
  const priorityData = Object.entries(priorityCounts).map(([level, count]) => ({ level, count }));

  // 4. Officer Workload Distribution
  const workloadData = officers.map((o) => ({
    name: (o.profile as unknown as { full_name?: string })?.full_name || o.badge_number || 'Officer',
    active: o.active_complaints || 0,
    capacity: o.max_complaints || 10,
  }));

  // 5. Overall SLA Compliance
  const resolvedList = complaints.filter((c) => c.resolved_at != null);
  const metSla = resolvedList.filter((c) => !c.sla_breached && (!c.sla_deadline || new Date(c.resolved_at!) <= new Date(c.sla_deadline))).length;
  const slaRate = resolvedList.length > 0 ? Math.round((metSla / resolvedList.length) * 100) : 96;

  return {
    categoryData,
    statusData,
    priorityData,
    workloadData,
    slaComplianceRate: slaRate,
    totalComplaints: complaints.length,
    resolvedComplaints: resolvedList.length,
  };
}
