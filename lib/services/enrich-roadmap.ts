// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Enrichment Service
//
// Accepts a raw AI-generated roadmap DAG and attempts to attach curated
// learning resources to each node via the resource-scraper layer.
// Falls back to the raw DAG if the scraper is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import type { GeneratedRoadmap } from "../../types/roadmap";
import { discoverResources } from "./resource-discovery";

/**
 * Enriches every node in the roadmap with scraped resource links.
 * Throws on hard failures; callers should wrap in try/catch and fall back
 * to the raw DAG when scraper services are offline.
 */
export async function enrichRoadmap(
  roadmap: GeneratedRoadmap
): Promise<GeneratedRoadmap> {
  const enrichedNodes = await Promise.all(
    roadmap.nodes.map(async (node) => {
      const resources = await discoverResources(node.searchKeywords);
      return { ...node, resources };
    })
  );

  return { ...roadmap, nodes: enrichedNodes };
}
