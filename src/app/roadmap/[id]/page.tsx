'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoadmapCanvas } from '@/components/canvas/roadmap-canvas';
import { ProgressBar } from '@/components/canvas/progress-bar';
import { NodeDrawer } from '@/components/drawer/node-drawer';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const { roadmapId, nodes, updateNodeStatus, selectNode, addBridgeNodes } = useRoadmapStore();
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);

  const handleOpenDrawer = useCallback((nodeId: string) => {
    selectNode(nodeId);
    setDrawerNodeId(nodeId);
  }, [selectNode]);

  const handleCloseDrawer = useCallback(() => {
    selectNode(null);
    setDrawerNodeId(null);
  }, [selectNode]);

  const handleMarkComplete = useCallback(async (nodeId: string) => {
    const previous = nodes.find((n) => n.id === nodeId)?.status ?? 'PENDING';
    // Optimistic update
    updateNodeStatus(nodeId, 'COMPLETED');
    try {
      if (roadmapId) {
        await api.updateProgress({ roadmapId, nodeId, status: 'COMPLETED' });
      }
    } catch {
      // Rollback
      updateNodeStatus(nodeId, previous);
    }
  }, [roadmapId, nodes, updateNodeStatus]);

  const handleMarkStuck = useCallback(async (nodeId: string) => {
    const previous = nodes.find((n) => n.id === nodeId)?.status ?? 'PENDING';
    updateNodeStatus(nodeId, 'STUCK');
    try {
      if (roadmapId) {
        await api.updateProgress({ roadmapId, nodeId, status: 'STUCK' });
      }
    } catch {
      updateNodeStatus(nodeId, previous);
    }
  }, [roadmapId, nodes, updateNodeStatus]);

  const handleReroute = useCallback(async (nodeId: string, context?: string) => {
    if (!roadmapId) return;
    const result = await api.rerouteRoadmap({
      roadmapId,
      stuckNodeId: nodeId,
      userProblemContext: context,
    });
    // Inject bridge nodes into canvas
    const bridgeNodesWithStatus = result.newNodes.map((n) => ({ ...n, status: 'PENDING' as const }));
    addBridgeNodes(bridgeNodesWithStatus, result.updatedEdges);
  }, [roadmapId, addBridgeNodes]);

  if (!roadmapId || nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center dot-grid-bg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
          <p className="text-slate-600 mb-4">Loading your roadmap...</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === drawerNodeId) ?? null;

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Home Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="bg-white shadow-card"
        >
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>
      </div>

      {/* Progress Bar */}
      <ProgressBar />

      {/* Canvas */}
      <RoadmapCanvas
        onOpenDrawer={handleOpenDrawer}
        onMarkComplete={handleMarkComplete}
        onMarkStuck={handleMarkStuck}
      />

      {/* Node Drawer */}
      <NodeDrawer
        node={selectedNode}
        roadmapId={roadmapId}
        onClose={handleCloseDrawer}
        onMarkComplete={handleMarkComplete}
        onMarkStuck={handleMarkStuck}
        onReroute={handleReroute}
        onNodeCompleted={(nodeId) => updateNodeStatus(nodeId, 'COMPLETED')}
      />
    </div>
  );
}
