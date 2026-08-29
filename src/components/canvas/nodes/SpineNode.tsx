'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, Check } from 'lucide-react';
import type { RoadmapNode } from '@/types';

export const SpineNode = memo(function SpineNode({ data }: NodeProps) {
  const node = data as unknown as RoadmapNode;
  return (
    <div className="w-[220px] rounded-md border-2 border-slate-900 bg-[#FFE600] px-3 py-2 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      <Handle type="target" position={Position.Top} className="!bg-slate-950" />
      <div className="flex items-start justify-between gap-2">
        <h3 className="leading-snug">{node.title}</h3>
        {node.status === 'COMPLETED' && <Check className="h-4 w-4 shrink-0" />}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold">
        <Clock className="h-3 w-3" /> {node.estimatedHours}h · {node.level}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-950" />
    </div>
  );
});