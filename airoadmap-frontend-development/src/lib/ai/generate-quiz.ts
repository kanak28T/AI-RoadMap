// PathCraft AI – Quiz Generator (Kanak's layer)
import { generateText } from "ai";
import { groq, GROQ_MODEL } from "./groq-client";
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

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).min(4).max(4),
      answerIndex: z.number().int().min(0).max(3),
      explanation: z.string(),
    })
  ).min(3).max(3),
});

function extractJson(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON found");
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Unbalanced JSON");
  return text.slice(start, end + 1);
}

export async function generateQuiz(
  nodeId: string,
  nodeTitle: string,
  nodeLevel: string
): Promise<DiagnosticQuiz> {
  const difficulty: Record<string, string> = {
    Prerequisite: "basic definitions and recognition",
    Core: "applied understanding and problem solving",
    Advanced: "synthesis, trade-offs and design decisions",
  };

  const prompt = `You are an expert instructional designer. Generate exactly 3 multiple-choice quiz questions for this learning topic.

TOPIC: "${nodeTitle}"
LEVEL: ${nodeLevel} — focus on ${difficulty[nodeLevel] ?? "applied understanding"}

Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["option A", "option B", "option C", "option D"],
      "answerIndex": 0,
      "explanation": "string explaining why the answer is correct"
    }
  ]
}

Rules:
- Exactly 3 questions, each with exactly 4 options.
- answerIndex is 0-3 (index of correct option).
- Each question tests a DIFFERENT concept.
- Return ONLY the JSON, no markdown, no code fences.`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { text } = await generateText({
        model: groq(GROQ_MODEL),
        prompt,
        maxOutputTokens: 1500,
        temperature: attempt === 1 ? 0.3 : 0.1,
      });

      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr);
      const validated = QuizSchema.parse(parsed);
      return { nodeId, questions: validated.questions };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[generateQuiz] attempt ${attempt} failed:`, lastError.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError ?? new Error("Failed to generate quiz after 3 attempts");
}
