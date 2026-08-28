// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Resource Discovery Service
//
// Given a set of search keywords for a roadmap node, returns a list of
// curated learning resource links. Integrate with a real scraper (e.g.
// SerpAPI, YouTube Data API, or a custom crawler) by replacing the stub below.
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredResource {
  title: string;
  url: string;
  type: "article" | "video" | "course" | "docs";
}

/**
 * Discovers learning resources for a node based on its search keywords.
 *
 * TODO: Replace stub with real scraper integration.
 */
export async function discoverResources(
  searchKeywords: string[]
): Promise<DiscoveredResource[]> {
  // Stub – returns empty array so the pipeline works end-to-end
  // while the real scraper layer is being built.
  void searchKeywords;
  return [];
}
