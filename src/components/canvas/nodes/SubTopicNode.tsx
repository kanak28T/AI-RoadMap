'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapSubTopic } from '@/types';

export const SubTopicNode = memo(function SubTopicNode({ data }: NodeProps) {
  const topic = data as unknown as RoadmapSubTopic;
  const completed = topic.status === 'COMPLETED';
  return (
    <div className={cn(
      'w-[200px] cursor-pointer rounded-md border-2 border-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]',
      completed ? 'bg-emerald-200' : 'bg-[#FFECC8] hover:bg-[#FFE3B0]'
    )}>
      <Handle type="target" position={Position.Left} className="!bg-slate-700" />
      <div className="flex items-start gap-2">
        <span className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white',
          completed ? 'bg-emerald-600' : topic.recommendation === 'recommended' ? 'bg-purple-600' : 'bg-emerald-600'
        )}>
          {completed || topic.recommendation ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
        </span>
        <span className="leading-snug">{topic.title}</span>
      </div>
      {topic.description && <p className="mt-1 line-clamp-2 pl-6 text-[10px] font-medium leading-tight text-slate-600">{topic.description}</p>}
      <Handle type="source" position={Position.Right} className="!bg-slate-700" />
    </div>
  );
});