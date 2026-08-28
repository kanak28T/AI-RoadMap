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

export async function discoverArticleResources(
  searchKeywords: string[],
  maxResults: number
): Promise<DiscoveredArticleResource[]> {
  if (searchKeywords.length === 0) {
    return [];
  }

  const resources: DiscoveredArticleResource[] = [];
  const seenUrls = new Set<string>();

  for (const keyword of searchKeywords) {
    try {
      const response = await axios.get<DevToArticle[]>(
        DEV_TO_API_URL,
        {
          params: {
            tag: keyword
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ""),
            top: 30,
            per_page: 30,
          },
          timeout: 10000,
          headers: {
            "User-Agent": "PathCraftAI/1.0",
          },
        }
      );

      const articles = response.data ?? [];

      for (const article of articles) {
        if (!article.title || !article.url) {
          continue;
        }

        if (seenUrls.has(article.url)) {
          continue;
        }

        const reactions =
          article.positive_reactions_count ??
          article.public_reactions_count ??
          0;

        const comments = article.comments_count ?? 0;

        if (reactions === 0 && comments === 0) {
          continue;
        }

        seenUrls.add(article.url);

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
      continue;
    }
  }

  return resources;
}

