import { validateLink } from "./link-validator";
import { discoverOfficialDocs } from "./official-docs";
import { discoverYouTubeResources } from "./youtube-discovery";
import { discoverGitHubResources } from "./github-discovery";
import { discoverArticleResources } from "./article-discovery";
import {
  getCachedResources,
  cacheResources,
} from "./resource-cache";

export type ResourceSource =
  | "Official Docs"
  | "YouTube"
  | "GitHub"
  | "Article";

export type ResourceType = "Video" | "Article" | "Repo";

export interface Resource {
  title: string;
  url: string;
  source: ResourceSource;
  type: ResourceType;
  isVerified: true;
}

export interface ResourceDiscoveryOptions {
  maxResultsPerSource?: number;
}

const DEFAULT_MAX_RESULTS = 5;

/**
 * Main resource discovery pipeline.
 *
 * Input:
 *   searchKeywords[] from Kanak's roadmap generator.
 *
 * Output:
 *   Verified learning resources.
 */
export async function discoverResources(
  searchKeywords: string[],
  options: ResourceDiscoveryOptions = {}
): Promise<Resource[]> {
  const maxResults =
    options.maxResultsPerSource ?? DEFAULT_MAX_RESULTS;

  const keywords = searchKeywords
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  if (keywords.length === 0) {
    return [];
  }

  // Check Redis before making external API requests.
  const cachedResources = await getCachedResources(keywords);

  if (cachedResources !== null) {
    return cachedResources;
  }

  const [
    officialDocs,
    youtubeResources,
    githubResources,
    articleResources,
  ] = await Promise.all([
    Promise.resolve(
      discoverOfficialDocs(keywords, maxResults)
    ),

    discoverYouTubeResources(keywords, maxResults),

    discoverGitHubResources(keywords, maxResults),

    discoverArticleResources(keywords, maxResults),
  ]);

  const discoveredResources: Resource[] = [
    ...officialDocs,
    ...youtubeResources,
    ...githubResources,
    ...articleResources,
  ].map((resource) => ({
    ...resource,
    isVerified: true as const,
  }));

  const verifiedResources =
    await verifyAndDeduplicateResources(
      discoveredResources
    );

  // Store verified resources only.
  await cacheResources(keywords, verifiedResources);

  return verifiedResources;
}

/**
 * Validate discovered URLs and remove duplicate URLs.
 */
async function verifyAndDeduplicateResources(
  resources: Resource[]
): Promise<Resource[]> {
  const uniqueResources = new Map<string, Resource>();

  for (const resource of resources) {
    if (uniqueResources.has(resource.url)) {
      continue;
    }

    uniqueResources.set(resource.url, resource);
  }

  const resourcesToVerify =
    Array.from(uniqueResources.values());

  const verificationResults = await Promise.all(
    resourcesToVerify.map(async (resource) => ({
      resource,
      validation: await validateLink(resource.url),
    }))
  );

  return verificationResults
    .filter(({ validation }) => validation.isValid)
    .map(({ resource }) => resource);
}

