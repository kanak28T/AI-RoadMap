'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomNodeData } from '@/types';

// React Flow v12 requires node type to extend Record<string,unknown>
type FlowNode = { id: string; data: Record<string, unknown>; [key: string]: unknown };

function CustomNodeComponent({ data: rawData }: NodeProps) {
  const data = rawData as unknown as CustomNodeData;

  const isMilestone = data.type === 'milestone';
  const isBridge = data.type === 'bridge';

  const getStatusBorder = () => {
    switch (data.status) {
      case 'COMPLETED':  return 'border-emerald-400 bg-emerald-50/40';
      case 'IN_PROGRESS': return 'border-amber-400 bg-amber-50/40';
      case 'STUCK':      return 'border-rose-400 bg-rose-50/40';
      default:           return 'border-slate-200 bg-white';
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      case 'IN_PROGRESS':
        return <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />;
      case 'STUCK':
        return <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-slate-300" />;
    }
  };

  const getLevelColor = () => {
    switch (data.level) {
      case 'Prerequisite': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Core':         return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Advanced':     return 'bg-orange-100 text-orange-700 border-orange-200';
      default:             return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200',
        'hover:-translate-y-0.5 cursor-pointer group',
        isMilestone ? 'w-[280px]' : 'w-[240px]',
        isBridge
          ? 'border-2 border-dashed border-violet-400 bg-violet-50'
          : cn('border', getStatusBorder())
      )}
      onClick={() => (data.onOpenDrawer as (id: string) => void)(data.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      {/* Milestone gold header */}
      {isMilestone && (
        <div className="h-7 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-xl flex items-center justify-center">
          <Trophy className="w-4 h-4 text-white" />
        </div>
      )}

      {/* AI Bridge badge */}
      {isBridge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-violet-600 text-white text-[10px] px-2 py-0.5">AI Bridge</Badge>
        </div>
      )}

      {/* Content */}
      <div className={cn('p-3', isMilestone && 'pt-2')}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={cn(
            'font-semibold text-slate-900 line-clamp-2 flex-1',
            isMilestone ? 'text-sm' : 'text-xs'
          )}>
            {data.title}
          </h3>
          <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getLevelColor())}>
            {data.level}
          </Badge>
          <span className="flex items-center text-[10px] text-slate-500">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {data.estimatedHours}h
          </span>
        </div>

        {/* Hover quick actions */}
        <div className="mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            className="flex-1 text-[10px] py-1 px-1.5 bg-brand-50 text-brand-700 rounded hover:bg-brand-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); (data.onOpenDrawer as (id: string) => void)(data.id); }}
          >
            Details
          </button>
          {data.status !== 'COMPLETED' && (
            <button
              className="flex-1 text-[10px] py-1 px-1.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); (data.onMarkComplete as (id: string) => void)(data.id); }}
            >
              Done ✓
            </button>
          )}
          {data.status !== 'STUCK' && data.status !== 'COMPLETED' && (
            <button
              className="flex-1 text-[10px] py-1 px-1.5 bg-rose-50 text-rose-700 rounded hover:bg-rose-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); (data.onMarkStuck as (id: string) => void)(data.id); }}
            >
              Stuck
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
