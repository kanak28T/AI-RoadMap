'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomNodeData } from '@/types';

function CustomNodeComponent({ data }: NodeProps<CustomNodeData>) {
  const isMilestone = data.type === 'milestone';
  const isBridge = data.type === 'bridge';

  const getStatusColor = () => {
    switch (data.status) {
      case 'COMPLETED':
        return 'border-emerald-400 bg-emerald-50/50';
      case 'IN_PROGRESS':
        return 'border-amber-400 bg-amber-50/50';
      case 'STUCK':
        return 'border-rose-400 bg-rose-50/50';
      default:
        return 'border-slate-200 bg-white';
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
      case 'Prerequisite':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Core':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Advanced':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group',
        isMilestone ? 'w-[280px]' : 'w-[240px]',
        isBridge
          ? 'border-2 border-dashed border-violet-400 bg-violet-50'
          : cn('border', getStatusColor())
      )}
      onClick={() => data.onOpenDrawer(data.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      {/* Milestone Header */}
      {isMilestone && (
        <div className="h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-xl flex items-center justify-center">
          <Trophy className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Bridge Badge */}
      {isBridge && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <Badge className="bg-violet-600 text-white text-xs">
            AI Bridge
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className={cn('p-3', isMilestone && 'pt-4')}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold text-slate-900 line-clamp-2',
              isMilestone ? 'text-base' : 'text-sm'
            )}>
              {data.title}
            </h3>
          </div>
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-xs', getLevelColor())}
          >
            {data.level}
          </Badge>
          <span className="flex items-center text-xs text-slate-500">
            <Clock className="w-3 h-3 mr-1" />
            {data.estimatedHours}h
          </span>
        </div>

        {/* Hover Actions */}
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            className="flex-1 text-xs py-1 px-2 bg-brand-50 text-brand-700 rounded hover:bg-brand-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenDrawer(data.id);
            }}
          >
            Details
          </button>
          {data.status !== 'COMPLETED' && (
            <button
              className="flex-1 text-xs py-1 px-2 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                data.onMarkComplete(data.id);
              }}
            >
              Done
            </button>
          )}
          {data.status !== 'STUCK' && data.status !== 'COMPLETED' && (
            <button
              className="flex-1 text-xs py-1 px-2 bg-rose-50 text-rose-700 rounded hover:bg-rose-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                data.onMarkStuck(data.id);
              }}
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
