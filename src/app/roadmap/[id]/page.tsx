'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoadmapCanvas } from '@/components/canvas/roadmap-canvas';
import { ProgressBar } from '@/components/canvas/progress-bar';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const { roadmapId, nodes, updateNodeStatus, selectNode } = useRoadmapStore();
  const [selectedDrawerNode, setSelectedDrawerNode] = useState<string | null>(null);

  useEffect(() => {
    // Check if roadmap exists in store
    if (!roadmapId || roadmapId !== params.id) {
      // TODO: Fetch roadmap from API if not in store
      console.warn('Roadmap not found in store');
    }
  }, [roadmapId, params.id]);

  const handleOpenDrawer = (nodeId: string) => {
    selectNode(nodeId);
    setSelectedDrawerNode(nodeId);
    // TODO: Open drawer component
  };

  const handleMarkComplete = async (nodeId: string) => {
    try {
      updateNodeStatus(nodeId, 'COMPLETED');
      
      // Sync with backend
      if (roadmapId) {
        await api.updateProgress({
          roadmapId,
          nodeId,
          status: 'COMPLETED',
        });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
      // Rollback on error
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        updateNodeStatus(nodeId, node.status);
      }
    }
  };

  const handleMarkStuck = async (nodeId: string) => {
    try {
      updateNodeStatus(nodeId, 'STUCK');
      
      // Sync with backend
      if (roadmapId) {
        await api.updateProgress({
          roadmapId,
          nodeId,
          status: 'STUCK',
        });
      }

      // TODO: Optionally trigger re-routing dialog
    } catch (error) {
      console.error('Failed to update progress:', error);
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        updateNodeStatus(nodeId, node.status);
      }
    }
  };

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

  return (
    <div className="h-screen relative">
      {/* Top Bar - Back Button */}
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

      {/* TODO: Node Drawer Component */}
      {selectedDrawerNode && (
        <div className="absolute right-0 top-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-20 p-6">
          <h3 className="text-xl font-bold mb-4">Node Details</h3>
          <p className="text-slate-600">
            Selected node: {selectedDrawerNode}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Drawer component coming next...
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSelectedDrawerNode(null)}
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
