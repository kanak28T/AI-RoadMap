// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Diagnostic Quiz Generation
//
// Generates 3 multiple-choice questions (MCQs) for a given roadmap node,
// each with 4 options, a correct answer index, and an explanation.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import type { DiagnosticQuiz } from "../../types/roadmap";

// ── Zod schema ───────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  question: z
    .string()
    .describe("Clear, unambiguous question stem testing a single concept"),
  options: z
    .array(z.string())
    .length(4)
    .describe("Exactly 4 answer choices; only one is correct"),
  answerIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe("Zero-based index of the correct answer in `options`"),
  explanation: z
    .string()
    .describe(
      "Short explanation (2–3 sentences) clarifying why the correct answer is right and addressing the most common misconception"
    ),
});

const DiagnosticQuizSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .length(3)
    .describe("Exactly 3 diagnostic MCQs"),
});

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Generates a 3-question diagnostic MCQ quiz for a roadmap node.
 *
 * Questions are calibrated to the node's `level`:
 * - Prerequisite → foundational recall / recognition
 * - Core         → applied understanding / problem solving
 * - Advanced     → synthesis, trade-offs, edge cases
 *
 * @param nodeId    - The roadmap node ID this quiz is attached to.
 * @param nodeTitle - The title of the node (e.g. "Async/Await in JavaScript").
 * @param nodeLevel - The curriculum tier: "Prerequisite" | "Core" | "Advanced".
 * @returns A `DiagnosticQuiz` ready to be stored / rendered.
 */
export async function generateQuiz(
  nodeId: string,
  nodeTitle: string,
  nodeLevel: string
): Promise<DiagnosticQuiz> {
  const difficultyGuide: Record<string, string> = {
    Prerequisite:
      "foundational recall and recognition — test whether the learner knows basic definitions and can identify correct usage",
    Core: "applied understanding — test whether the learner can solve realistic problems and explain behaviour",
    Advanced:
      "synthesis and critical thinking — test trade-offs, edge cases, performance implications, and design decisions",
  };

  const difficulty =
    difficultyGuide[nodeLevel] ??
    "applied understanding appropriate to the topic";

  const systemPrompt = `You are PathCraft AI, an expert instructional designer specialised in technical education.
Your task is to generate exactly 3 multiple-choice diagnostic questions for a learning node.

Rules you MUST follow:
- Each question must test a DISTINCT concept within the topic.
- Each question must have EXACTLY 4 answer choices.
- Exactly ONE answer must be correct; the other three must be plausible distractors.
- \`answerIndex\` is zero-based (0 = first option, 3 = last option).
- The \`explanation\` must state why the correct answer is right AND briefly address the most common wrong assumption.
- Do NOT include the answer inside the question stem.
- Questions must be calibrated to the difficulty level described below.`;

  const userPrompt = `Topic: "${nodeTitle}"
Curriculum level: ${nodeLevel}
Difficulty calibration: ${difficulty}

Generate 3 diagnostic MCQs for this topic.`;

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: DiagnosticQuizSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return {
    nodeId,
    questions: object.questions,
  } as DiagnosticQuiz;
}
