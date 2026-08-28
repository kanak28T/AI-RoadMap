import { Redis } from "@upstash/redis";

import type { Resource } from "./resource-discovery";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function createCacheKey(searchKeywords: string[]): string {
  const normalizedKeywords = [...searchKeywords]
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .sort();

  return `pathcraft:resources:${normalizedKeywords.join("|")}`;
}

export async function getCachedResources(
  searchKeywords: string[]
): Promise<Resource[] | null> {
  if (!redis || searchKeywords.length === 0) {
    return null;
  }

  try {
    const key = createCacheKey(searchKeywords);

    const cached = await redis.get<Resource[]>(key);

    return cached ?? null;
  } catch {
    // Cache failure should never break resource discovery.
    return null;
  }
}

export async function cacheResources(
  searchKeywords: string[],
  resources: Resource[]
): Promise<void> {
  if (!redis || searchKeywords.length === 0) {
    return;
  }

  try {
    const key = createCacheKey(searchKeywords);

    await redis.set(key, resources, {
      ex: CACHE_TTL_SECONDS,
    });
  } catch {
    // Cache failure should never break resource discovery.
  }
}

