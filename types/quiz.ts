export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuizSubmission {
  userId: string;
  roadmapId: string;
  nodeId: string;
  answers: number[];
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completed: boolean;
}
