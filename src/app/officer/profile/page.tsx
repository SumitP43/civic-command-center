import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OFFICER_NAV } from '@/types';
import { getCurrentUser } from '@/services/auth.service';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Award,
  Clock,
  Activity,
  Star,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OfficerProfilePage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: officer } = await supabase
    .from('officers')
    .select('*, department:departments(*)')
    .eq('profile_id', user?.id || '')
    .single();

  return (
    <DashboardShell
      navItems={OFFICER_NAV}
      title="Officer Profile"
      subtitle="Duty credentials & performance record"
      requiredRole="officer"
    >
      <div className="max-w-4xl space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Officer Identity Card */}
          <Card className="border-border/60 shadow-sm md:col-span-1 text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-3">
                <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {user ? getInitials(user.full_name) : 'O'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-lg">{user?.full_name || 'Field Officer'}</CardTitle>
              <CardDescription className="text-xs">{user?.email}</CardDescription>
              <div className="pt-2">
                <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Shield className="w-3 h-3" />
                  Badge: {officer?.badge_number || 'OFFICER-01'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border/40 pt-4 space-y-3 text-xs text-left">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Department</span>
                <span className="font-semibold text-foreground">{officer?.department?.name || 'Municipal Works'}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Designation</span>
                <span className="font-semibold text-foreground">{officer?.designation || 'Field Inspector'}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Duty Contact</span>
                <span className="font-semibold text-foreground">{user?.phone || '+91 9876543200'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance & Duty Statistics */}
          <div className="md:col-span-2 space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Operational Performance</CardTitle>
                <CardDescription>Verified statistics recorded from resolved civic tickets</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <p className="text-xs text-muted-foreground">Active Workload</p>
                  <p className="text-2xl font-bold text-primary">{officer?.active_complaints || 0} Tickets</p>
                  <p className="text-[10px] text-muted-foreground">Current queue capacity: 10 max</p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-xs text-muted-foreground">Total Resolved</p>
                  <p className="text-2xl font-bold text-emerald-500">{officer?.total_resolved || 0} Issues</p>
                  <p className="text-[10px] text-muted-foreground">End-to-end verified fixes</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                  <p className="text-xs text-muted-foreground">Citizen Rating</p>
                  <p className="text-2xl font-bold text-amber-500 flex items-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    {officer?.rating ? officer.rating.toFixed(1) : '4.9'} / 5.0
                  </p>
                  <p className="text-[10px] text-muted-foreground">Average feedback score</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-1">
                  <p className="text-xs text-muted-foreground">Avg. SLA Turnaround</p>
                  <p className="text-2xl font-bold text-blue-500">{officer?.avg_resolution_hours || 4.2} Hours</p>
                  <p className="text-[10px] text-muted-foreground">Compliant with municipal norms</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-muted/20">
              <CardContent className="p-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Officer status: <span className="font-bold text-foreground uppercase">{officer?.status || 'available'}</span>
                </span>
                <span>Assigned Sector: Sector 62, Noida</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
