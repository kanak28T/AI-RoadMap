// PathCraft AI – Groq Provider Client
// Uses the official @ai-sdk/groq package which correctly targets
// Groq's /v1/chat/completions endpoint (not the Responses API).
import { createGroq } from "@ai-sdk/groq";

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

// llama-3.1-8b-instant was shut down on Groq (free/dev) on 2026-08-16.
// Official replacement: openai/gpt-oss-20b
// Override with GROQ_MODEL in .env.local if the team switches models later.
export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";
