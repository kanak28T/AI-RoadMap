'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import type { RoadmapNode } from '@/types';

export const AIBridgeNode = memo(function AIBridgeNode({ data }: NodeProps) {
  const node = data as unknown as RoadmapNode;
  return (
    <div className="relative w-[220px] rounded-md border-2 border-dashed border-purple-600 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-950">
      <Handle type="target" position={Position.Top} className="!bg-purple-600" />
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
        <Sparkles className="h-3 w-3" /> [AI Bridge]
      </div>
      <h3 className="text-sm font-bold">{node.title}</h3>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-600" />
    </div>
  );
});