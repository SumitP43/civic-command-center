'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, FileText, CheckCircle2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3b82f6',
  AI_ANALYZED: '#8b5cf6',
  ASSIGNED: '#f59e0b',
  ACCEPTED: '#06b6d4',
  IN_PROGRESS: '#eab308',
  RESOLVED: '#10b981',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

interface DepartmentChartsProps {
  data: {
    categoryData: { name: string; count: number }[];
    statusData: { status: string; count: number }[];
    priorityData: { level: string; count: number }[];
    workloadData: { name: string; active: number; capacity: number }[];
    slaComplianceRate: number;
    totalComplaints: number;
    resolvedComplaints: number;
  };
}

export function DepartmentCharts({ data }: DepartmentChartsProps) {
  const {
    categoryData,
    statusData,
    priorityData,
    workloadData,
    slaComplianceRate,
    totalComplaints,
    resolvedComplaints,
  } = data;

  return (
    <div className="space-y-6">
      {/* 3 Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">SLA Compliance Rate</p>
              <h3 className="text-2xl font-bold text-emerald-600">{slaComplianceRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Tracked Complaints</p>
              <h3 className="text-2xl font-bold">{totalComplaints}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Successfully Resolved</p>
              <h3 className="text-2xl font-bold text-blue-600">{resolvedComplaints}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2x2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Complaints by Category */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Complaints by Category</CardTitle>
            <CardDescription className="text-xs">
              Distribution of incoming civic issues across categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {categoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No categorical data recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name}: ${(Number(percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Status Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Workflow Status Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Operational progression from submission to resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={`status-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Priority Level Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Priority Level Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Deterministic priority classification distribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry) => (
                      <Cell key={`pri-${entry.level}`} fill={PRIORITY_COLORS[entry.level] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Officer Workload & Capacity Comparison */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Officer Workload vs Capacity</CardTitle>
            <CardDescription className="text-xs">
              Current active assignments compared to maximum limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {workloadData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No active officer workload data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="active" fill="#3b82f6" name="Active Tasks" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="capacity" fill="#94a3b8" name="Max Capacity" opacity={0.3} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
