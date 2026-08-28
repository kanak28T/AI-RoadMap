import axios from "axios";

export interface DiscoveredGitHubResource {
  title: string;
  url: string;
  source: "GitHub";
  type: "Repo";
}

const GITHUB_API_URL =
  "https://api.github.com/search/repositories";

export async function discoverGitHubResources(
  searchKeywords: string[],
  maxResults: number
): Promise<DiscoveredGitHubResource[]> {
  if (searchKeywords.length === 0) {
    return [];
  }

  const resources: DiscoveredGitHubResource[] = [];

  for (const keyword of searchKeywords) {
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "PathCraftAI",
      };

      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      const response = await axios.get(GITHUB_API_URL, {
        params: {
          q: keyword,
          sort: "stars",
          order: "desc",
          per_page: maxResults,
        },
        headers,
        timeout: 10000,
      });

      for (const repo of response.data.items ?? []) {
        resources.push({
          title: repo.full_name,
          url: repo.html_url,
          source: "GitHub",
          type: "Repo",
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

