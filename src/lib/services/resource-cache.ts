// PathCraft AI – Redis Cache Layer (Reshal's layer)
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export interface Resource {
  title: string;
  url: string;
  source: "Official Docs" | "YouTube" | "GitHub" | "Article";
  type: "Video" | "Article" | "Repo";
  isVerified: boolean;
  duration?: string;
}

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

function createCacheKey(keywords: string[]): string {
  return `pathcraft:resources:${keywords.sort().join("|").toLowerCase()}`;
}

export async function getCachedResources(
  keywords: string[]
): Promise<Resource[] | null> {
  const client = getRedis();
  if (!client || keywords.length === 0) return null;
  try {
    const key = createCacheKey(keywords);
    return await client.get<Resource[]>(key);
  } catch {
    return null;
  }
}

export async function setCachedResources(
  keywords: string[],
  resources: Resource[]
): Promise<void> {
  const client = getRedis();
  if (!client || keywords.length === 0) return;
  try {
    const key = createCacheKey(keywords);
    await client.set(key, resources, { ex: CACHE_TTL });
  } catch {
    // Cache failure is non-fatal
  }
}
