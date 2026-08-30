// PathCraft AI – Typed API client
import type {
  GenerateRoadmapRequest,
  GenerateRoadmapResponse,
  UpdateProgressRequest,
  UpdateProgressResponse,
  RerouteRequest,
  RerouteResponse,
  DiagnosticQuiz,
  QuizSubmissionRequest,
  QuizSubmissionResponse,
} from "@/types";

// Empty string ensures requests use current origin (e.g. /api/...)
const BASE = "";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.status, `Server error: ${res.status}`);
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? data?.message ?? "Request failed");
  }
  
  return data as T;
}

export const api = {
  /** POST /api/roadmap/generate */
  generateRoadmap: (data: GenerateRoadmapRequest): Promise<GenerateRoadmapResponse> =>
    fetchJson(`${BASE}/api/roadmap/generate`, { method: "POST", body: JSON.stringify(data) }),

  /** POST /api/progress/update */
  updateProgress: (data: UpdateProgressRequest): Promise<UpdateProgressResponse> =>
    fetchJson(`${BASE}/api/progress/update`, { method: "POST", body: JSON.stringify(data) }),

  /** POST /api/roadmap/reroute */
  rerouteRoadmap: (data: RerouteRequest): Promise<RerouteResponse> =>
    fetchJson(`${BASE}/api/roadmap/reroute`, { method: "POST", body: JSON.stringify(data) }),

  /** GET /api/quiz/:nodeId?roadmapId=xxx */
  getQuiz: (nodeId: string, roadmapId: string): Promise<DiagnosticQuiz> =>
    fetchJson(`${BASE}/api/quiz/${nodeId}?roadmapId=${encodeURIComponent(roadmapId)}`),

  /** POST /api/quiz/submit */
  submitQuiz: (data: QuizSubmissionRequest): Promise<QuizSubmissionResponse> =>
    fetchJson(`${BASE}/api/quiz/submit`, { method: "POST", body: JSON.stringify(data) }),
};

export default api;
