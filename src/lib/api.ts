// PathCraft AI – Typed API client
// Wraps all backend route handlers with proper types from the integrated backends.
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

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

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
  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Request failed");
  return data as T;
}

export const api = {
  /** POST /api/roadmap/generate → Kanak + Reshal + Sanvi */
  generateRoadmap: (data: GenerateRoadmapRequest): Promise<GenerateRoadmapResponse> =>
    fetchJson(`${BASE}/roadmap/generate`, { method: "POST", body: JSON.stringify(data) }),

  /** POST /api/progress/update → Sanvi */
  updateProgress: (data: UpdateProgressRequest): Promise<UpdateProgressResponse> =>
    fetchJson(`${BASE}/progress/update`, { method: "POST", body: JSON.stringify(data) }),

  /** POST /api/roadmap/reroute → Kanak + Reshal + Sanvi */
  rerouteRoadmap: (data: RerouteRequest): Promise<RerouteResponse> =>
    fetchJson(`${BASE}/roadmap/reroute`, { method: "POST", body: JSON.stringify(data) }),

  /** GET /api/quiz/:nodeId?roadmapId=xxx → Kanak + Sanvi */
  getQuiz: (nodeId: string, roadmapId: string): Promise<DiagnosticQuiz> =>
    fetchJson(`${BASE}/quiz/${nodeId}?roadmapId=${roadmapId}`),

  /** POST /api/quiz/submit → Sanvi */
  submitQuiz: (data: QuizSubmissionRequest): Promise<QuizSubmissionResponse> =>
    fetchJson(`${BASE}/quiz/submit`, { method: "POST", body: JSON.stringify(data) }),
};

export default api;
