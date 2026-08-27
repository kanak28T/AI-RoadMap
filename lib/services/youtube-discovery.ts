import axios from "axios";

export interface DiscoveredYouTubeResource {
  title: string;
  url: string;
  source: "YouTube";
  type: "Video";
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
}

const YOUTUBE_API_URL =
  "https://www.googleapis.com/youtube/v3";

const HIGH_VIEW_THRESHOLD = 100_000;

export async function discoverYouTubeResources(
  searchKeywords: string[],
  maxResults: number
): Promise<DiscoveredYouTubeResource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || searchKeywords.length === 0) {
    return [];
  }

  const resources: DiscoveredYouTubeResource[] = [];

  for (const keyword of searchKeywords) {
    try {
      const searchResponse = await axios.get(
        `${YOUTUBE_API_URL}/search`,
        {
          params: {
            part: "snippet",
            q: keyword,
            type: "video",
            maxResults: Math.min(maxResults * 2, 50),
            key: apiKey,
          },
          timeout: 10000,
        }
      );

      const searchItems =
        (searchResponse.data.items ?? []) as YouTubeSearchItem[];

      const videoIds = searchItems
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length === 0) {
        continue;
      }

      const detailsResponse = await axios.get(
        `${YOUTUBE_API_URL}/videos`,
        {
          params: {
            part: "snippet,statistics",
            id: videoIds.join(","),
            key: apiKey,
          },
          timeout: 10000,
        }
      );

      const videos =
        (detailsResponse.data.items ?? []) as YouTubeVideoItem[];

      for (const video of videos) {
        const videoId = video.id;

        if (!videoId) {
          continue;
        }

        const viewCount = Number(
          video.statistics?.viewCount ?? 0
        );

        const likeCount = Number(
          video.statistics?.likeCount ?? 0
        );

        const hasHighViews =
          viewCount >= HIGH_VIEW_THRESHOLD;

        // YouTube Data API does not provide a current
        // public star-rating field, so we use engagement
        // as the quality signal.
        const hasStrongEngagement =
          viewCount > 0 &&
          likeCount / viewCount >= 0.04;

        if (!hasHighViews && !hasStrongEngagement) {
          continue;
        }

        resources.push({
          title:
            video.snippet?.title ?? "YouTube Learning Video",
          url: `https://www.youtube.com/watch?v=${videoId}`,
          source: "YouTube",
          type: "Video",
        });

        if (resources.length >= maxResults) {
          return resources;
        }
      }
    } catch {
      // One failed keyword must not stop the pipeline.
      continue;
    }
  }

  return resources;
}