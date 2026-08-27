'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, UserCheck, Flame, AlertTriangle, ArrowUpDown, Clock } from 'lucide-react';
import { OfficerAssignDialog } from '@/components/officers/officer-assign-dialog';
import { formatDistanceToNow, format } from 'date-fns';
import type { ComplaintCategory, Department } from '@/types';

interface DepartmentComplaintsTableProps {
  initialComplaints: any[];
  categories: ComplaintCategory[];
  departmentId: string;
}

export function DepartmentComplaintsTable({
  initialComplaints,
  categories,
  departmentId,
}: DepartmentComplaintsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'priority_desc' | 'created_desc' | 'sla_asc'>('priority_desc');

  // Filter complaints
  const filtered = initialComplaints.filter((c) => {
    if (search) {
      const s = search.toLowerCase();
      const matchNumber = c.complaint_number?.toLowerCase().includes(s);
      const matchTitle = c.title?.toLowerCase().includes(s);
      const matchAddress = c.address?.toLowerCase().includes(s);
      const matchCitizen = c.citizen?.full_name?.toLowerCase().includes(s);
      if (!matchNumber && !matchTitle && !matchAddress && !matchCitizen) return false;
    }

    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority_level !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && c.category_id !== categoryFilter) return false;

    if (assignmentFilter === 'ASSIGNED' && !c.assigned_officer_id) return false;
    if (assignmentFilter === 'UNASSIGNED' && c.assigned_officer_id) return false;

    return true;
  });

  // Sort complaints
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority_desc') {
      return (b.priority_score || 0) - (a.priority_score || 0);
    }
    if (sortBy === 'sla_asc') {
      if (!a.sla_deadline) return 1;
      if (!b.sla_deadline) return -1;
      return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search complaint #, title, citizen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="AI_ANALYZED">AI Analyzed</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div>
          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignment Filter */}
        <div>
          <Select value={assignmentFilter} onValueChange={(val) => setAssignmentFilter(val || 'ALL')}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Staffing</SelectItem>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority_desc">Priority (High → Low)</SelectItem>
              <SelectItem value="sla_asc">SLA Urgency</SelectItem>
              <SelectItem value="created_desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-32 font-semibold">Complaint #</TableHead>
              <TableHead className="font-semibold">Issue & Category</TableHead>
              <TableHead className="w-28 font-semibold">Priority</TableHead>
              <TableHead className="w-28 font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned Officer</TableHead>
              <TableHead className="font-semibold">SLA Deadline</TableHead>
              <TableHead className="w-28 text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                  No complaints match your active filters.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((c) => {
                const activeAssignment = c.assignments?.find((a: any) => a.is_active);
                const assignedOfficer = activeAssignment?.officer;

                const isCritical = c.priority_level === 'CRITICAL';
                const isHigh = c.priority_level === 'HIGH';

                const isSlaBreached = c.sla_breached || (c.sla_deadline && new Date(c.sla_deadline) < new Date() && c.status !== 'RESOLVED');

                return (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    {/* Complaint Number */}
                    <TableCell className="font-mono font-bold text-xs text-primary">
                      <Link href={`/department/complaints/${c.id}`} className="hover:underline">
                        {c.complaint_number}
                      </Link>
                    </TableCell>

                    {/* Title & Category */}
                    <TableCell className="max-w-xs">
                      <div className="font-semibold text-sm line-clamp-1">{c.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{c.category?.name || 'General'}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 h-4 font-semibold ${
                          isCritical
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : isHigh
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.priority_level} ({c.priority_score})
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] py-0 h-4">
                        {c.status}
                      </Badge>
                    </TableCell>

                    {/* Officer */}
                    <TableCell>
                      {assignedOfficer ? (
                        <div className="text-xs font-medium">
                          <span>{assignedOfficer.profile?.full_name || 'Officer'}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {assignedOfficer.badge_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* SLA */}
                    <TableCell>
                      {c.sla_deadline ? (
                        <div className={`text-xs ${isSlaBreached ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          <div className="flex items-center gap-1">
                            {isSlaBreached ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span>{format(new Date(c.sla_deadline), 'dd MMM, HH:mm')}</span>
                          </div>
                          {isSlaBreached && (
                            <span className="text-[10px] text-destructive">Overdue</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <OfficerAssignDialog
                          complaintId={c.id}
                          departmentId={departmentId}
                          currentOfficerId={assignedOfficer?.id}
                          isReassign={!!assignedOfficer}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title={assignedOfficer ? 'Reassign' : 'Assign'}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Link
                          href={`/department/complaints/${c.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
