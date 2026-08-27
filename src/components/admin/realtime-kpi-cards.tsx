'use client';

import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface CommandCenterStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  in_progress: number;
  resolved: number;
  sla_approaching: number;
  sla_breached: number;
  escalations_pending: number;
}

interface RealtimeKpiCardsProps {
  initialStats: CommandCenterStats;
}

export function RealtimeKpiCards({ initialStats }: RealtimeKpiCardsProps) {
  const [stats, setStats] = useState<CommandCenterStats>(initialStats);

  // Subscribe to changes on complaints table to increment/update counters
  useRealtimeSubscription({
    table: 'complaints',
    onInsert: (newComplaint) => {
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        active: prev.active + 1,
        critical: newComplaint.priority_level === 'CRITICAL' ? prev.critical + 1 : prev.critical,
        high: newComplaint.priority_level === 'HIGH' ? prev.high + 1 : prev.high,
      }));
    },
    onUpdate: (updatedComplaint) => {
      if (updatedComplaint.status === 'RESOLVED' || updatedComplaint.status === 'CLOSED') {
        setStats((prev) => ({
          ...prev,
          active: Math.max(0, prev.active - 1),
          resolved: prev.resolved + 1,
        }));
      }
    },
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* 1. Total */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Complaints</p>
            <h3 className="text-2xl font-bold">{stats.total}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 2. Active */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Workload</p>
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 3. Critical */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Critical Priority</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 4. High */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">High Priority</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.high}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 5. In Progress */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">In Field Progress</p>
            <h3 className="text-2xl font-bold">{stats.in_progress}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 6. Resolved */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Successfully Resolved</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolved}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 7. SLA Breached */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">SLA Breached</p>
            <h3 className="text-2xl font-bold text-destructive">{stats.sla_breached}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 8. Escalations */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Escalations</p>
            <h3 className="text-2xl font-bold">{stats.escalations_pending}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
