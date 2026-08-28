// PathCraft AI – Roadmap Enrichment (Reshal's layer)
// Attaches verified resources to every node from Kanak's generated DAG
import { discoverResources } from "./resource-discovery";
import type { GeneratedRoadmap } from "@/lib/ai/generate-roadmap";

export async function enrichRoadmap(
  roadmap: GeneratedRoadmap
): Promise<GeneratedRoadmap & { nodes: Array<GeneratedRoadmap["nodes"][0] & { resources: Awaited<ReturnType<typeof discoverResources>> }> }> {
  const enrichedNodes = await Promise.all(
    roadmap.nodes.map(async (node) => ({
      ...node,
      resources: await discoverResources(node.searchKeywords ?? []),
    }))
  );

  return { ...roadmap, nodes: enrichedNodes };
}
