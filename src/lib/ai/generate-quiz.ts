// PathCraft AI – Quiz Generator (Kanak's layer)
// Ported from feature/kanak-ai-orchestration:lib/ai/generate-quiz.ts
import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

export interface DiagnosticQuiz {
  nodeId: string;
  questions: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }>;
}

const DiagnosticQuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      answerIndex: z.number().int().min(0).max(3),
      explanation: z.string(),
    })
  ).length(3),
});

export async function generateQuiz(
  nodeId: string,
  nodeTitle: string,
  nodeLevel: string
): Promise<DiagnosticQuiz> {
  const difficultyGuide: Record<string, string> = {
    Prerequisite: "foundational recall and recognition — basic definitions and correct usage",
    Core: "applied understanding — solve realistic problems and explain behaviour",
    Advanced: "synthesis and critical thinking — trade-offs, edge cases, design decisions",
  };

  const difficulty = difficultyGuide[nodeLevel] ?? "applied understanding";

  const systemPrompt = `You are PathCraft AI, an expert instructional designer.
Generate exactly 3 multiple-choice diagnostic questions for a learning node.

Rules:
- Each question tests a DISTINCT concept.
- Each question has EXACTLY 4 answer choices.
- Exactly ONE answer is correct; three are plausible distractors.
- answerIndex is zero-based (0–3).
- explanation states why the correct answer is right and addresses common misconceptions.
- Do NOT include the answer in the question stem.`;

  const userPrompt = `Topic: "${nodeTitle}"
Level: ${nodeLevel}
Difficulty: ${difficulty}
Generate 3 diagnostic MCQs.`;

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: DiagnosticQuizSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return { nodeId, questions: object.questions };
}
