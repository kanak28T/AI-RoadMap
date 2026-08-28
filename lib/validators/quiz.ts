import { z } from "zod";

export const quizSubmissionSchema = z.object({
  userId: z.string().min(1),
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  answers: z.record(
    z.string(),
    z.union([z.string(), z.number()])
  ),
});
