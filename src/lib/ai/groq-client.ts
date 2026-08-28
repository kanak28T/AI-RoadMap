// PathCraft AI – Groq Provider Client
// Kanak's groq-client.ts — ported into the unified Next.js project
import { createOpenAI } from "@ai-sdk/openai";

export const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "",
});
