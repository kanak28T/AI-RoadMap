import axios from "axios";

export interface DiscoveredArticleResource {
  title: string;
  url: string;
  source: "Article";
  type: "Article";
}

interface DevToArticle {
  title?: string;
  url?: string;
  positive_reactions_count?: number;
  comments_count?: number;
  public_reactions_count?: number;
}

const DEV_TO_API_URL = "https://dev.to/api/articles";

const MIN_REACTIONS = 20;

export async function discoverArticleResources(
  searchKeywords: string[],
  maxResults: number
): Promise<DiscoveredArticleResource[]> {
  if (searchKeywords.length === 0) {
    return [];
  }

  const resources: DiscoveredArticleResource[] = [];

  for (const keyword of searchKeywords) {
    try {
      const response = await axios.get<DevToArticle[]>(
        DEV_TO_API_URL,
        {
          params: {
            tag: keyword.toLowerCase().replace(/\s+/g, ""),
            per_page: Math.min(maxResults * 2, 30),
          },
          timeout: 10000,
          headers: {
            "User-Agent": "PathCraftAI/1.0",
          },
        }
      );

      for (const article of response.data ?? []) {
        if (!article.title || !article.url) {
          continue;
        }

        const reactions =
          article.positive_reactions_count ??
          article.public_reactions_count ??
          0;

        if (reactions < MIN_REACTIONS) {
          continue;
        }

        resources.push({
          title: article.title,
          url: article.url,
          source: "Article",
          type: "Article",
        });

        if (resources.length >= maxResults) {
          return resources;
        }
      }
    } catch {
      // A failed article source should not stop discovery.
      continue;
    }
  }

  return resources;
}