// PathCraft AI – Roadmap Enrichment (Reshal's layer)
// Attaches verified resources to every node from Kanak's generated DAG
import { discoverResources } from "./resource-discovery";
import type { GeneratedRoadmap } from "@/lib/ai/generate-roadmap";
import type { Resource } from "./resource-cache";

export type EnrichedRoadmapNode = GeneratedRoadmap["nodes"][0] & {
  resources: Resource[];
};

export type EnrichedRoadmap = Omit<GeneratedRoadmap, "nodes"> & {
  nodes: EnrichedRoadmapNode[];
};

export async function enrichRoadmap(roadmap: GeneratedRoadmap): Promise<EnrichedRoadmap> {
  const enrichedNodes = await Promise.all(
    roadmap.nodes.map(async (node) => ({
      ...node,
      resources: await discoverResources(node.searchKeywords ?? []),
    }))
  );

  return { ...roadmap, nodes: enrichedNodes };
}
