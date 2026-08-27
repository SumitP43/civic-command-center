import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DEPARTMENT_NAV } from '@/types';
import { getAdminDepartmentId, getDepartmentOfficers } from '@/services/department.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Shield,
  Star,
  CheckCircle2,
  Clock,
  Eye,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { OfficerWorkloadBar } from '@/components/officers/officer-workload-bar';
import { getInitials } from '@/lib/utils';
import type { OfficerWithProfile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DepartmentOfficersPage() {
  const departmentId = await getAdminDepartmentId();
  const supabase = createAdminClient();

  const [officers, deptRes] = await Promise.all([
    departmentId ? getDepartmentOfficers(departmentId) : [],
    departmentId ? supabase.from('departments').select('name, code').eq('id', departmentId).single() : { data: null },
  ]);

  const deptName = deptRes.data ? `${deptRes.data.name}` : 'Department';

  return (
    <DashboardShell
      navItems={DEPARTMENT_NAV}
      title="Department Officer Management"
      subtitle={`${deptName} Field Personnel`}
      requiredRole="department_admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Field Officers & Workload Roster</h2>
            <p className="text-xs text-muted-foreground">
              Monitor officer capacity, ongoing assignments, and individual performance ratings.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-xs">
            {officers.length} Active Officers Registered
          </Badge>
        </div>

        {officers.length === 0 ? (
          <Card className="p-12 text-center bg-muted/20 border-dashed">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-base">No Officers Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              There are currently no officers registered under {deptName}.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officers.map((officer) => {
              const isAvailable = officer.status === 'available';
              const isBusy = officer.status === 'busy';

              return (
                <Card key={officer.id} className="border-border hover:border-primary/40 transition-all flex flex-col justify-between">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={officer.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {getInitials(officer.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm leading-tight">
                            {officer.profile?.full_name || 'Officer'}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Badge: {officer.badge_number || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {officer.designation || 'Field Specialist'}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 h-4 font-semibold capitalize ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : isBusy
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {officer.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-4 text-xs">
                    {/* Workload Progress */}
                    <OfficerWorkloadBar
                      active={officer.active_complaints}
                      max={officer.max_complaints}
                    />

                    {/* Stats Metrics */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-muted/40 text-center">
                      <div>
                        <span className="block font-bold text-sm">{officer.total_resolved || 0}</span>
                        <span className="text-[10px] text-muted-foreground">Resolved</span>
                      </div>
                      <div>
                        <span className="block font-bold text-sm flex items-center justify-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          {officer.rating || 4.8}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Rating</span>
                      </div>
                      <div>
                        <span className="block font-bold text-sm">{officer.avg_resolution_hours || 4.2}h</span>
                        <span className="text-[10px] text-muted-foreground">Avg Time</span>
                      </div>
                    </div>

                    {/* Contact & Location Info */}
                    <div className="space-y-1 text-muted-foreground text-[11px]">
                      {officer.profile?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{officer.profile.phone}</span>
                        </div>
                      )}
                      {officer.profile?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{officer.profile.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/department/officers/${officer.id}`}
                      className="inline-flex items-center justify-center w-full gap-1 text-xs font-medium border border-input rounded-md h-8 hover:bg-muted/50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Performance Profile
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
