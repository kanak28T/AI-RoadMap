'use client';

import { useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Check, Circle, Minus, Sparkles } from 'lucide-react';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { computeRoadmapGraph } from '@/lib/roadmap-layout';
import type { RoadmapData } from '@/types';
import { AIBridgeNode } from './nodes/AIBridgeNode';
import { SpineNode } from './nodes/SpineNode';
import { SubTopicNode } from './nodes/SubTopicNode';

const nodeTypes = { spineNode: SpineNode, subTopicNode: SubTopicNode, bridgeNode: AIBridgeNode };

interface RoadmapCanvasProps {
  onOpenDrawer: (nodeId: string) => void;
  onMarkComplete: (nodeId: string) => void;
  onMarkStuck: (nodeId: string) => void;
}

export function RoadmapCanvas({ onOpenDrawer }: RoadmapCanvasProps) {
  const { nodes: roadmapNodes, spine, edges: roadmapEdges } = useRoadmapStore();
  const layout = useMemo(
    () => computeRoadmapGraph({
      roadmapId: '',
      title: '',
      totalEstimatedHours: 0,
      nodes: spine.length > 0 ? spine : roadmapNodes,
      edges: roadmapEdges,
    } as RoadmapData),
    [roadmapNodes, roadmapEdges, spine]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => setNodes(layout.nodes), [layout.nodes, setNodes]);
  useEffect(() => setEdges(layout.edges), [layout.edges, setEdges]);

  const displayNodes = useMemo<Node[]>(
    () => nodes.map((node) => ({ ...node, data: { ...node.data, onOpenDrawer } })),
    [nodes, onOpenDrawer]
  );

  return (
    <div className="h-full w-full bg-slate-50">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onOpenDrawer((node.data as { parentId?: string }).parentId ?? node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'default' }}
      >
        <Background color="#CBD5E1" gap={22} size={1} variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} className="!border-slate-200 !bg-white !shadow-md" />
        <MiniMap
          nodeColor={(node) => node.type === 'subTopicNode' ? '#FFECC8' : node.type === 'bridgeNode' ? '#c084fc' : '#FFE600'}
          className="!border-slate-200 !bg-white"
          maskColor="rgba(248, 250, 252, 0.8)"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute right-4 top-48 z-10 w-[min(16rem,calc(100vw-2rem))] rounded-md border-2 border-slate-950 bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:top-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-900">
          <Sparkles className="h-4 w-4 text-purple-600" /> PathCraft map
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> Module</span>
          <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-purple-600" /> Recommended</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Completed</span>
          <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-emerald-600" /> Alternative</span>
        </div>
      </div>
    </div>
  );
}
