'use client';

import { useState, useEffect } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Sparkles,
  UserCheck,
  Play,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  FilePlus,
  Radio,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  complaintNumber?: string;
  complaintId?: string;
}

interface LiveActivityFeedProps {
  initialEvents?: ActivityEvent[];
}

export function LiveActivityFeed({ initialEvents = [] }: LiveActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);

  // Subscribe to complaint updates live stream
  useRealtimeSubscription<any>({
    table: 'complaint_updates',
    onInsert: (newUpdate) => {
      const newEvent: ActivityEvent = {
        id: newUpdate.id || `upd-${Date.now()}`,
        type: newUpdate.new_status || 'update',
        title: `Status Changed to ${newUpdate.new_status || 'Update'}`,
        description: newUpdate.notes || 'Field team status update recorded.',
        timestamp: newUpdate.created_at || new Date().toISOString(),
        complaintId: newUpdate.complaint_id,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    },
  });

  // Subscribe to escalations live stream
  useRealtimeSubscription<any>({
    table: 'escalations',
    onInsert: (newEsc) => {
      const newEvent: ActivityEvent = {
        id: newEsc.id || `esc-${Date.now()}`,
        type: 'escalation',
        title: `SLA Escalation Triggered (${newEsc.level === 'super_admin' ? 'Level 2' : 'Level 1'})`,
        description: newEsc.reason || 'SLA deadline exceeded.',
        timestamp: newEsc.created_at || new Date().toISOString(),
        complaintId: newEsc.complaint_id,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'escalation':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'RESOLVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-amber-500" />;
      case 'ASSIGNED':
      case 'ACCEPTED':
        return <UserCheck className="h-4 w-4 text-primary" />;
      case 'AI_ANALYZED':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      default:
        return <FilePlus className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Live Operational Feed</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Radio className="h-3 w-3 animate-pulse" />
            <span>Streaming Live</span>
          </div>
        </div>
        <CardDescription className="text-xs">
          Real-time stream of citywide dispatching, AI evaluations, and resolution events.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40 max-h-[380px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Awaiting realtime system activities...
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="p-3 hover:bg-muted/20 transition-colors flex items-start gap-2.5 text-xs">
                <div className="mt-0.5 shrink-0">{getIcon(e.type)}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-foreground truncate">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] line-clamp-1">
                    {e.description}
                  </p>
                  {e.complaintId && (
                    <Link
                      href={`/department/complaints/${e.complaintId}`}
                      className="text-primary hover:underline text-[10px] font-medium inline-block pt-0.5"
                    >
                      Inspect Case →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
