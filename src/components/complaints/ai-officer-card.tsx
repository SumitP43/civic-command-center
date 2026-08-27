'use client';

import { AlertTriangle, ShieldCheck, Building2, Flame, Brain, Info, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PRIORITY_RANGES } from '@/types';
import type { ComplaintWithRelations } from '@/types';

interface AiOfficerCardProps {
  complaint: ComplaintWithRelations;
  onOpenManualReview?: () => void;
}

export function AiOfficerCard({ complaint, onOpenManualReview }: AiOfficerCardProps) {
  const confidence = complaint.ai_confidence !== null && complaint.ai_confidence !== undefined
    ? Math.round(complaint.ai_confidence * 100)
    : null;
  const isManualReview = complaint.requires_manual_review || (confidence !== null && confidence < 70);
  const priorityConfig = complaint.priority_level ? PRIORITY_RANGES[complaint.priority_level] : PRIORITY_RANGES.MEDIUM;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Gemini AI Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isManualReview ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Manual Review Required
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3 mr-1" />
                AI Analyzed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Operational Summary */}
        {complaint.ai_summary && (
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Operational Summary
            </span>
            <p className="text-sm font-medium text-foreground">{complaint.ai_summary}</p>
          </div>
        )}

        {/* Primary Classification Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Severity */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Severity
            </span>
            <p className="text-sm font-bold text-foreground">
              {complaint.severity || 'MEDIUM'}
            </p>
          </div>

          {/* Priority Score */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" style={{ color: priorityConfig.color }} />
              Priority Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold" style={{ color: priorityConfig.color }}>
                {complaint.priority_score ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">({complaint.priority_level || 'MED'})</span>
            </div>
          </div>

          {/* Department */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              Department
            </span>
            <p className="text-sm font-bold text-foreground truncate">
              {complaint.department?.code || complaint.department?.name || 'Unassigned'}
            </p>
          </div>

          {/* AI Confidence */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-purple-500" />
              Confidence
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {confidence !== null ? `${confidence}%` : 'N/A'}
              </span>
              {confidence !== null && (
                <Progress value={confidence} className="h-1.5 flex-1" />
              )}
            </div>
          </div>
        </div>

        {/* Risk & Reasoning Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Primary Risk */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
              Identified Primary Risk
            </span>
            <p className="font-medium text-foreground">
              {complaint.ai_risk || 'General Infrastructure'}
            </p>
          </div>

          {/* AI Reasoning */}
          {complaint.ai_reasoning && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                Analysis Reasoning
              </span>
              <p className="text-muted-foreground line-clamp-2">
                {complaint.ai_reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Manual Review Call-to-Action for Admins/Officers */}
        {isManualReview && onOpenManualReview && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Low confidence or unmapped department. Administrator review recommended.</span>
            </div>
            <button
              onClick={onOpenManualReview}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline shrink-0 ml-2"
            >
              Review & Correct
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
