import { z } from "zod";

export const quizSubmissionSchema = z.object({
  userId: z.string().min(1).optional(),
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3)),
});
