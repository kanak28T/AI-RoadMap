'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoadmapCanvas } from '@/components/canvas/roadmap-canvas';
import { ProgressBar } from '@/components/canvas/progress-bar';
import { NodeDrawer } from '@/components/drawer/node-drawer';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { RoadmapNode } from '@/types';

export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const { roadmapId, nodes, updateNodeStatus, selectNode, addBridgeNodes, setRoadmap } =
    useRoadmapStore();
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  const urlId = params.id as string;

  // Re-hydrate store from API when the page is hard-refreshed
  // (Zustand persist will already have the data if the user just navigated)
  useEffect(() => {
    const storeDoesNotMatchUrl = !roadmapId || roadmapId !== urlId;

    if (urlId && storeDoesNotMatchUrl) {
      setHydrating(true);
      setHydrationError(null);
      fetch(`/api/roadmap/${urlId}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) {
            throw new Error(data.error ?? 'Unable to load roadmap');
          }
          return data;
        })
        .then((data) => {
          if (!data.roadmapId || !Array.isArray(data.nodes)) {
            throw new Error('Roadmap response is invalid');
          }

          // Nodes stored in DB may not have status/resources — apply defaults
          const nodesWithDefaults = (data.nodes as Array<Record<string, unknown>>).map(
            (n): RoadmapNode => ({
              id: n.id as string,
              title: n.title as string,
              type: (n.type as RoadmapNode['type']) ?? 'standard',
              level: (n.level as RoadmapNode['level']) ?? 'Core',
              estimatedHours: n.estimatedHours as number ?? 0,
              whyRecommended: (n.whyRecommended as string) ?? '',
              searchKeywords: (n.searchKeywords as string[]) ?? [],
              prerequisites: (n.prerequisites as string[]) ?? [],
              status: (n.status as RoadmapNode['status']) ?? 'PENDING',
              resources: (n.resources as RoadmapNode['resources']) ?? [],
                subTopics: n.subTopics as RoadmapNode['subTopics'],
            })
          );
          setRoadmap({ ...data, nodes: nodesWithDefaults });
        })
        .catch((error: unknown) => {
          setHydrationError(error instanceof Error ? error.message : 'Unable to load roadmap');
        })
        .finally(() => setHydrating(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);

  const handleOpenDrawer = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setDrawerNodeId(nodeId);
    },
    [selectNode]
  );

  const handleCloseDrawer = useCallback(() => {
    selectNode(null);
    setDrawerNodeId(null);
  }, [selectNode]);

  const handleMarkComplete = useCallback(
    async (nodeId: string) => {
      const previous = nodes.find((n) => n.id === nodeId)?.status ?? 'PENDING';
      // Optimistic update
      updateNodeStatus(nodeId, 'COMPLETED');
      try {
        if (roadmapId) {
          await api.updateProgress({ roadmapId, nodeId, status: 'COMPLETED' });
        }
      } catch {
        // Rollback on failure
        updateNodeStatus(nodeId, previous);
      }
    },
    [roadmapId, nodes, updateNodeStatus]
  );

  const handleMarkStuck = useCallback(
    async (nodeId: string) => {
      const previous = nodes.find((n) => n.id === nodeId)?.status ?? 'PENDING';
      updateNodeStatus(nodeId, 'STUCK');
      try {
        if (roadmapId) {
          await api.updateProgress({ roadmapId, nodeId, status: 'STUCK' });
        }
      } catch {
        updateNodeStatus(nodeId, previous);
      }
    },
    [roadmapId, nodes, updateNodeStatus]
  );

  const handleReroute = useCallback(
    async (nodeId: string, context?: string) => {
      if (!roadmapId) return;
      const result = await api.rerouteRoadmap({
        roadmapId,
        stuckNodeId: nodeId,
        userProblemContext: context,
      });
      const bridgeNodesWithStatus = result.newNodes.map((n) => ({
        ...n,
        status: 'PENDING' as const,
      }));
      addBridgeNodes(bridgeNodesWithStatus, result.updatedEdges);
    },
    [roadmapId, addBridgeNodes]
  );

  // Show loading spinner while hydrating from API
  if (hydrating) {
    return (
      <div className="h-screen flex items-center justify-center dot-grid-bg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
          <p className="text-slate-600">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  // Store is empty and hydration finished without data → fallback to home
  if (hydrationError || !roadmapId || nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center dot-grid-bg">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{hydrationError ?? 'Roadmap not found or expired.'}</p>
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
