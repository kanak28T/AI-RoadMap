import { z } from "zod";

export const updateProgressSchema = z.object({
  userId: z.string().min(1),
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "STUCK",
  ]),
});
