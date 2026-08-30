import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RoadmapNode,
  RoadmapEdge,
  NodeStatus,
  GenerateRoadmapResponse,
} from '@/types';

interface RoadmapStore {
  // State
  roadmapId: string | null;
  title: string | null;
  nodes: RoadmapNode[];
  spine: RoadmapNode[];
  edges: RoadmapEdge[];
  selectedNode: string | null;
  completionPercentage: number;
  totalEstimatedHours: number;
  
  // Actions
  setRoadmap: (data: GenerateRoadmapResponse) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  selectNode: (nodeId: string | null) => void;
  addBridgeNodes: (nodes: RoadmapNode[], edges: RoadmapEdge[]) => void;
  clearRoadmap: () => void;
  
  // Computed
  getCompletedCount: () => number;
  getMilestoneCount: () => number;
  getCompletedMilestones: () => number;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      // Initial State
      roadmapId: null,
      title: null,
      nodes: [],
      spine: [],
      edges: [],
      selectedNode: null,
      completionPercentage: 0,
      totalEstimatedHours: 0,
      
      // Actions
      setRoadmap: (data) => set({
        roadmapId: data.roadmapId,
        title: data.title,
        nodes: data.nodes.map((node) => ({
          ...node,
          status: node.status ?? "PENDING",
          resources: node.resources ?? [],
          searchKeywords: node.searchKeywords ?? [],
          prerequisites: node.prerequisites ?? [],
        })),
        spine: (data.spine ?? data.nodes).map((node) => ({
          ...node,
          status: node.status ?? "PENDING",
          resources: node.resources ?? [],
          searchKeywords: node.searchKeywords ?? [],
          prerequisites: node.prerequisites ?? [],
        })),
        edges: data.edges,
        totalEstimatedHours: data.totalEstimatedHours,
        completionPercentage: 0,
      }),
      
      updateNodeStatus: (nodeId, status) => set((state) => {
        const updatedNodes = state.nodes.map((node) =>
          node.id === nodeId ? { ...node, status } : node
        );
        
        const completed = updatedNodes.filter((n) => n.status === 'COMPLETED').length;
        const total = updatedNodes.length;
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          nodes: updatedNodes,
          completionPercentage,
        };
      }),
      
      selectNode: (nodeId) => set({ selectedNode: nodeId }),
      
      addBridgeNodes: (newNodes, newEdges) => set((state) => ({
        nodes: [
          ...state.nodes,
          ...newNodes.map((node) => ({
            ...node,
            status: node.status ?? "PENDING",
            resources: node.resources ?? [],
          })),
        ],
        edges: newEdges.length > 0 ? newEdges : state.edges,
      })),
      
      clearRoadmap: () => set({
        roadmapId: null,
        title: null,
        nodes: [],
        spine: [],
        edges: [],
        selectedNode: null,
        completionPercentage: 0,
        totalEstimatedHours: 0,
      }),
      
      // Computed
      getCompletedCount: () => {
        const state = get();
        return state.nodes.filter((n) => n.status === 'COMPLETED').length;
      },
      
      getMilestoneCount: () => {
        const state = get();
        return state.nodes.filter((n) => n.type === 'milestone').length;
      },
      
      getCompletedMilestones: () => {
        const state = get();
        return state.nodes.filter(
          (n) => n.type === 'milestone' && n.status === 'COMPLETED'
        ).length;
      },
    }),
    {
      name: 'pathcraft-roadmap',
    }
  )
);
