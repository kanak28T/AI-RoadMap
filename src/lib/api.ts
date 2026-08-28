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
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Generate Roadmap
  generateRoadmap: async (
    data: GenerateRoadmapRequest
  ): Promise<GenerateRoadmapResponse> => {
    return fetchJson(`${API_URL}/roadmap/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update Progress
  updateProgress: async (
    data: UpdateProgressRequest
  ): Promise<UpdateProgressResponse> => {
    return fetchJson(`${API_URL}/progress/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Re-route Roadmap
  rerouteRoadmap: async (
    data: RerouteRequest
  ): Promise<RerouteResponse> => {
    return fetchJson(`${API_URL}/roadmap/reroute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get Diagnostic Quiz
  getQuiz: async (
    nodeId: string,
    roadmapId: string
  ): Promise<DiagnosticQuiz> => {
    return fetchJson(`${API_URL}/quiz/${nodeId}?roadmapId=${roadmapId}`);
  },

  // Submit Quiz
  submitQuiz: async (
    data: QuizSubmissionRequest
  ): Promise<QuizSubmissionResponse> => {
    return fetchJson(`${API_URL}/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default api;
