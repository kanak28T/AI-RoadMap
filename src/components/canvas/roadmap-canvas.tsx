'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './custom-node';
import { getLayoutedElements } from '@/lib/dagre-layout';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import type { CustomNodeData } from '@/types';

const nodeTypes = {
  custom: CustomNode,
};

interface RoadmapCanvasProps {
  onOpenDrawer: (nodeId: string) => void;
  onMarkComplete: (nodeId: string) => void;
  onMarkStuck: (nodeId: string) => void;
}

export function RoadmapCanvas({
  onOpenDrawer,
  onMarkComplete,
  onMarkStuck,
}: RoadmapCanvasProps) {
  const { nodes: roadmapNodes, edges: roadmapEdges } = useRoadmapStore();

  // Transform roadmap nodes to React Flow nodes with layout
  const initialNodes = useMemo(() => {
    if (roadmapNodes.length === 0) return [];

    const nodesWithHandlers = roadmapNodes.map((node) => ({
      ...node,
      onOpenDrawer,
      onMarkComplete,
      onMarkStuck,
    }));

    return getLayoutedElements(nodesWithHandlers, roadmapEdges);
  }, [roadmapNodes, roadmapEdges, onOpenDrawer, onMarkComplete, onMarkStuck]);

  // Transform roadmap edges to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return roadmapEdges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
    }));
  }, [roadmapEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when roadmap changes
  useMemo(() => {
    if (roadmapNodes.length > 0) {
      const updatedNodes = getLayoutedElements(
        roadmapNodes.map((node) => ({
          ...node,
          onOpenDrawer,
          onMarkComplete,
          onMarkStuck,
        })),
        roadmapEdges
      );
      setNodes(updatedNodes);
    }
  }, [roadmapNodes, roadmapEdges, setNodes, onOpenDrawer, onMarkComplete, onMarkStuck]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background
          color="#CBD5E1"
          gap={20}
          size={1}
          variant="dots"
        />
        <Controls
          showInteractive={false}
          className="bg-white border border-slate-200 rounded-lg shadow-card"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            switch (data.status) {
              case 'COMPLETED':
                return '#10B981';
              case 'IN_PROGRESS':
                return '#F59E0B';
              case 'STUCK':
                return '#F43F5E';
              default:
                return '#94A3B8';
            }
          }}
          className="!bg-white !border !border-slate-200 !rounded-lg !shadow-card"
          maskColor="rgba(248, 250, 252, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
