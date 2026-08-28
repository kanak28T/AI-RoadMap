export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: string | number;
}

export interface QuizSubmission {
  userId: string;
  roadmapId: string;
  nodeId: string;
  answers: Record<string, string | number>;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completed: boolean;
}
