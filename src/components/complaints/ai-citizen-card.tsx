'use client';

import { Sparkles, AlertCircle, Clock, ShieldCheck, Building2, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PRIORITY_RANGES } from '@/types';
import type { Complaint } from '@/types';

interface AiCitizenCardProps {
  complaint: Partial<Complaint>;
}

export function AiCitizenCard({ complaint }: AiCitizenCardProps) {
  const status = complaint.ai_processing_status || 'pending';
  const severity = complaint.severity || 'MEDIUM';
  const priorityScore = complaint.priority_score ?? 0;
  const priorityConfig = complaint.priority_level ? PRIORITY_RANGES[complaint.priority_level] : PRIORITY_RANGES.MEDIUM;

  if (status === 'pending' || status === 'processing') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="h-5 w-5 animate-spin text-primary" />
            <CardTitle className="text-base">AI Civic Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Our AI is currently analyzing your complaint to categorize the issue, assess severity, and automatically route it to the right department...
          </p>
          <Progress value={65} className="h-2" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Scheduled for Officer Verification
              </p>
              <p className="text-xs text-muted-foreground">
                Your complaint has been safely recorded and will be manually categorized and routed by a municipal officer shortly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">AI Assessment</CardTitle>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Automated Analysis
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Operational Summary */}
        {complaint.ai_summary && (
          <div className="p-3 rounded-lg bg-muted/40 text-sm border border-border/50">
            <p className="text-muted-foreground italic">&ldquo;{complaint.ai_summary}&rdquo;</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Priority Score */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Flame className="h-3.5 w-3.5" />
              Priority Score
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold" style={{ color: priorityConfig.color }}>
                {priorityScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold px-1.5 py-0"
              style={{ color: priorityConfig.color, borderColor: priorityConfig.color }}
            >
              {complaint.priority_level || 'MEDIUM'}
            </Badge>
          </div>

          {/* Severity */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              Severity
            </div>
            <p className="text-sm font-semibold text-foreground capitalize">
              {severity.toLowerCase()}
            </p>
            {complaint.ai_risk && (
              <p className="text-[11px] text-muted-foreground truncate">{complaint.ai_risk}</p>
            )}
          </div>

          {/* Routing / Department */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Building2 className="h-3.5 w-3.5" />
              Assigned Department
            </div>
            <p className="text-sm font-semibold text-foreground">
              {complaint.department_id ? 'Routed' : 'Assigned to Municipal Cell'}
            </p>
            <p className="text-[11px] text-muted-foreground">SLA Active</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
