// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Diagnostic Quiz Generation
//
// Generates 3 MCQs for a given roadmap node.
// The generated format matches the shared QuizQuestion interface:
// question, options, answerIndex, explanation.
// ─────────────────────────────────────────────────────────────────────────────

import { generateText, Output } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  id: z
    .string()
    .describe("Unique question id: q1, q2, or q3"),

  question: z
    .string()
    .describe("Clear question testing one concept"),

  options: z
    .array(z.string())
    .length(4)
    .describe("Exactly 4 answer choices"),

  answerIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe(
      "Zero-based index of the correct answer. 0 means first option, 1 second, 2 third, 3 fourth.",
    ),

  explanation: z
    .string()
    .describe("Short explanation of why the correct answer is correct"),
});

const DiagnosticQuizSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .length(3)
    .describe("Exactly 3 diagnostic MCQs"),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

// ── Main function ────────────────────────────────────────────────────────────

export async function generateQuiz(
  nodeId: string,
  nodeTitle: string,
  nodeLevel: string,
): Promise<{
  nodeId: string;
  questions: GeneratedQuestion[];
}> {
  const difficultyGuide: Record<string, string> = {
    Prerequisite:
      "foundational recall and recognition — basic definitions and correct usage",

    Core:
      "applied understanding — solving realistic problems and explaining behaviour",

    Advanced:
      "synthesis and critical thinking — trade-offs, edge cases, and design decisions",
  };

  const difficulty =
    difficultyGuide[nodeLevel] ??
    "applied understanding appropriate to the topic";

  const systemPrompt = `You are PathCraft AI, an expert instructional designer specialised in technical education.

Generate exactly 3 multiple-choice diagnostic questions for the specified learning topic.

Rules:
- Generate exactly 3 questions.
- Each question must test a DISTINCT concept.
- Each question must have EXACTLY 4 options.
- Exactly ONE option must be correct.
- answerIndex MUST be a number from 0 to 3.
- answerIndex is the ZERO-BASED position of the correct option.
- 0 = first option.
- 1 = second option.
- 2 = third option.
- 3 = fourth option.
- Do NOT generate a correctAnswer field.
- Question IDs must be q1, q2, and q3.
- Explanations should briefly explain why the selected answer is correct.
- Follow the provided schema exactly.
- Return only the structured quiz data.`;

  const userPrompt = `Create a diagnostic quiz for this learning node.

Topic: "${nodeTitle}"

Curriculum level: ${nodeLevel}

Difficulty calibration:
${difficulty}

Generate exactly 3 MCQs.`;

  const { output } = await generateText({
    model: groq("openai/gpt-oss-20b"),

    system: systemPrompt,

    prompt: userPrompt,

    output: Output.object({
      schema: DiagnosticQuizSchema,
      name: "diagnostic_quiz",
      description:
        "Exactly three diagnostic multiple-choice questions.",
    }),

    maxRetries: 2,

    providerOptions: {
      groq: {
        structuredOutputs: true,
        strictJsonSchema: true,
        reasoningEffort: "low",
      },
    },
  });

  if (!output) {
    throw new Error(
      "Groq did not return diagnostic quiz questions.",
    );
  }

  // ── Additional application-side validation ────────────────────────────────

  if (output.questions.length !== 3) {
    throw new Error(
      `Expected 3 quiz questions but received ${output.questions.length}.`,
    );
  }

  for (const question of output.questions) {
    if (question.options.length !== 4) {
      throw new Error(
        `Question ${question.id} must contain exactly 4 options.`,
      );
    }

    if (
      question.answerIndex < 0 ||
      question.answerIndex > 3
    ) {
      throw new Error(
        `Question ${question.id} has an invalid answerIndex.`,
      );
    }
  }

  return {
    nodeId,
    questions: output.questions,
  };
}