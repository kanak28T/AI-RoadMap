import {
  discoverResources,
  type Resource,
} from "./resource-discovery.js";

export interface RoadmapNode {
  id: string;
  title: string;
  type: "standard" | "milestone";
  level: "Prerequisite" | "Core" | "Advanced";
  estimatedHours: number;
  whyRecommended: string;
  searchKeywords: string[];
  prerequisites: string[];
  [key: string]: unknown;
}

export interface RoadmapEdge {
  source: string;
  target: string;
}

export interface RoadmapGraph {
  title: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  [key: string]: unknown;
}

export interface EnrichedRoadmapNode extends RoadmapNode {
  resources: Resource[];
}

export interface EnrichedRoadmapGraph
  extends Omit<RoadmapGraph, "nodes"> {
  nodes: EnrichedRoadmapNode[];
}

/**
 * Enriches every roadmap node with verified learning resources.
 *
 * The original roadmap structure is preserved.
 * Only the `resources` field is added to each node.
 */
export async function enrichRoadmap(
  roadmap: RoadmapGraph
): Promise<EnrichedRoadmapGraph> {
  const enrichedNodes = await Promise.all(
    roadmap.nodes.map(async (node) => {
      const resources = await discoverResources(
        node.searchKeywords ?? []
      );

      return {
        ...node,
        resources,
      };
    })
  );

  return {
    ...roadmap,
    nodes: enrichedNodes,
  };
}