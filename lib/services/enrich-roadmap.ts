import {
  discoverResources,
} from "./resource-discovery";
import type { EnrichedRoadmapGraph, RoadmapGraph } from "../../types/roadmap";

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

