// PathCraft AI – Link Validator (Reshal's layer)
import axios from "axios";

const USER_AGENT = "PathCraftAI/1.0 (link-validator)";
const TIMEOUT_MS = 6000;

export async function isUrlAlive(url: string): Promise<boolean> {
  try {
    // Try HEAD first (fast, no body download)
    const res = await axios.head(url, {
      timeout: TIMEOUT_MS,
      headers: { "User-Agent": USER_AGENT },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return res.status >= 200 && res.status < 300;
  } catch {
    // Fallback to GET in case server rejects HEAD
    try {
      const res = await axios.get(url, {
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": USER_AGENT },
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 300,
        // Stream to avoid downloading full body
        responseType: "stream",
      });
      res.data?.destroy?.();
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    }
  }
}

export async function filterDeadLinks<T extends { url: string }>(
  resources: T[]
): Promise<T[]> {
  const results = await Promise.allSettled(
    resources.map(async (r) => ({ resource: r, alive: await isUrlAlive(r.url) }))
  );
  return results
    .filter((r) => r.status === "fulfilled" && r.value.alive)
    .map((r) => (r as PromiseFulfilledResult<{ resource: T; alive: boolean }>).value.resource);
}
