// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Diagnostic Quiz Generation
//
// Generates 3 MCQs for a given roadmap node calibrated to its difficulty level.
// Questions conform to Sanvi's QuizQuestion interface (id, question, options,
// correctAnswer) so they can be stored directly in the diagnosticQuiz table.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

// ── Zod schema ────────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  id: z.string().describe("Unique question id e.g. 'q1', 'q2', 'q3'"),
  question: z.string().describe("Clear question stem testing a single concept"),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer choices"),
  correctAnswer: z
    .string()
    .describe("The exact text of the correct option (must match one of the options)"),
  explanation: z
    .string()
    .describe("2-3 sentences explaining why the correct answer is right"),
});

const DiagnosticQuizSchema = z.object({
  questions: z.array(QuestionSchema).length(3).describe("Exactly 3 MCQs"),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Generates a 3-question diagnostic MCQ quiz for a roadmap node.
 * Returns questions compatible with Sanvi's QuizQuestion interface.
 */
export async function generateQuiz(
  nodeId: string,
  nodeTitle: string,
  nodeLevel: string
): Promise<{ nodeId: string; questions: GeneratedQuestion[] }> {
  const difficultyGuide: Record<string, string> = {
    Prerequisite: "foundational recall and recognition — basic definitions and correct usage",
    Core: "applied understanding — solving realistic problems and explaining behaviour",
    Advanced: "synthesis and critical thinking — trade-offs, edge cases, design decisions",
  };

  const difficulty = difficultyGuide[nodeLevel] ?? "applied understanding appropriate to the topic";

  const systemPrompt = `You are PathCraft AI, an expert instructional designer specialised in technical education.
Generate exactly 3 multiple-choice diagnostic questions for a learning node.

Rules:
- Each question tests a DISTINCT concept within the topic.
- Each question has EXACTLY 4 answer choices.
- Exactly ONE answer is correct; the other three are plausible distractors.
- correctAnswer must be the exact text of the correct option (not an index).
- question IDs are "q1", "q2", "q3".
- The explanation clarifies why the correct answer is right and addresses common misconceptions.
- Calibrate difficulty as described below.`;

  const userPrompt = `Topic: "${nodeTitle}"
Curriculum level: ${nodeLevel}
Difficulty calibration: ${difficulty}

Generate 3 diagnostic MCQs.`;

  const { object } = await generateObject({
    model: groq("openai/gpt-oss-20b"),
    schema: DiagnosticQuizSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return { nodeId, questions: object.questions };
}
