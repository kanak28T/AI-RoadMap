// PathCraft AI – Resource Discovery (Reshal's layer)
// Aggregates resources from YouTube, GitHub, Official Docs and Articles
import axios from "axios";
import { getCachedResources, setCachedResources, type Resource } from "./resource-cache";
import { filterDeadLinks } from "./link-validator";

const MAX_PER_SOURCE = 2;

// ── YouTube ──────────────────────────────────────────────────────────────────
async function fetchYouTube(keywords: string[]): Promise<Resource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const query = keywords.join(" ");
    const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        order: "relevance",
        maxResults: MAX_PER_SOURCE,
        key: apiKey,
      },
      timeout: 8000,
    });
    return (res.data.items ?? []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, string>;
      const idObj = item.id as Record<string, string>;
      return {
        title: snippet.title ?? "YouTube Video",
        url: `https://www.youtube.com/watch?v=${idObj.videoId}`,
        source: "YouTube" as const,
        type: "Video" as const,
        isVerified: false,
      };
    });
  } catch {
    return [];
  }
}

// ── GitHub ───────────────────────────────────────────────────────────────────
async function fetchGitHub(keywords: string[]): Promise<Resource[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PathCraftAI",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const results: Resource[] = [];
  for (const keyword of keywords.slice(0, 2)) {
    try {
      const res = await axios.get("https://api.github.com/search/repositories", {
        params: { q: keyword, sort: "stars", order: "desc", per_page: 1 },
        headers,
        timeout: 8000,
      });
      for (const repo of res.data.items ?? []) {
        results.push({
          title: repo.full_name,
          url: repo.html_url,
          source: "GitHub" as const,
          type: "Repo" as const,
          isVerified: false,
        });
      }
    } catch {
      continue;
    }
  }
  return results.slice(0, MAX_PER_SOURCE);
}

// ── Official Docs ─────────────────────────────────────────────────────────────
function matchOfficialDocs(keywords: string[]): Resource[] {
  const docMap: Record<string, { title: string; url: string }> = {
    react: { title: "React Official Docs", url: "https://react.dev" },
    nextjs: { title: "Next.js Docs", url: "https://nextjs.org/docs" },
    typescript: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/" },
    javascript: { title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
    python: { title: "Python Docs", url: "https://docs.python.org/3/" },
    node: { title: "Node.js Docs", url: "https://nodejs.org/en/docs/" },
    nodejs: { title: "Node.js Docs", url: "https://nodejs.org/en/docs/" },
    sql: { title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/" },
    postgres: { title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/" },
    docker: { title: "Docker Docs", url: "https://docs.docker.com" },
    css: { title: "MDN CSS Reference", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
    html: { title: "MDN HTML Reference", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
    git: { title: "Git Documentation", url: "https://git-scm.com/doc" },
    graphql: { title: "GraphQL Docs", url: "https://graphql.org/learn/" },
    prisma: { title: "Prisma Docs", url: "https://www.prisma.io/docs" },
    tailwind: { title: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs" },
    aws: { title: "AWS Docs", url: "https://docs.aws.amazon.com" },
    rust: { title: "The Rust Book", url: "https://doc.rust-lang.org/book/" },
    go: { title: "Go Docs", url: "https://go.dev/doc/" },
  };

  const matches: Resource[] = [];
  for (const keyword of keywords) {
    const key = keyword.toLowerCase().replace(/[^a-z]/g, "");
    if (docMap[key]) {
      matches.push({
        ...docMap[key],
        source: "Official Docs" as const,
        type: "Article" as const,
        isVerified: true, // Official docs are always assumed live
      });
    }
  }
  return matches.slice(0, MAX_PER_SOURCE);
}

// ── Articles (freeCodeCamp / Dev.to) ─────────────────────────────────────────
async function fetchArticles(keywords: string[]): Promise<Resource[]> {
  const query = keywords.join(" ");
  try {
    const res = await axios.get("https://dev.to/api/articles", {
      params: { tag: keywords[0], top: 7, per_page: MAX_PER_SOURCE },
      timeout: 6000,
    });
    return (res.data ?? []).slice(0, MAX_PER_SOURCE).map((article: Record<string, string>) => ({
      title: article.title ?? query,
      url: article.url ?? `https://dev.to/search?q=${encodeURIComponent(query)}`,
      source: "Article" as const,
      type: "Article" as const,
      isVerified: false,
    }));
  } catch {
    // fallback to freeCodeCamp search link
    return [{
      title: `freeCodeCamp: ${query}`,
      url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(query)}`,
      source: "Article" as const,
      type: "Article" as const,
      isVerified: false,
    }];
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export async function discoverResources(keywords: string[]): Promise<Resource[]> {
  if (!keywords || keywords.length === 0) return [];

  // 1. Check cache
  const cached = await getCachedResources(keywords);
  if (cached && cached.length > 0) return cached;

  // 2. Fetch from all sources in parallel
  const [youtube, github, articles] = await Promise.all([
    fetchYouTube(keywords),
    fetchGitHub(keywords),
    fetchArticles(keywords),
  ]);
  const officialDocs = matchOfficialDocs(keywords);

  // 3. Combine (official docs already verified, skip validation for them)
  const toValidate = [...youtube, ...github, ...articles];
  const verified = await filterDeadLinks(toValidate);

  const all: Resource[] = [
    ...officialDocs,
    ...verified.map((r) => ({ ...r, isVerified: true })),
  ].slice(0, 6); // max 6 per node

  // 4. Cache result
  await setCachedResources(keywords, all);

  return all;
}
