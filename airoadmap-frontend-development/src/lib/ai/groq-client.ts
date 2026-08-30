// PathCraft AI – Groq Provider Client
// Uses the official @ai-sdk/groq package which correctly targets
// Groq's /v1/chat/completions endpoint (not the Responses API).
import { createGroq } from "@ai-sdk/groq";

const apiKey = process.env.GROQ_API_KEY?.trim() ?? "";

export const groq = createGroq({
  apiKey,
});

// llama-3.1-8b-instant was shut down on Groq (free/dev) on 2026-08-16.
// Current Groq-compatible model names are typically openai/gpt-oss-20b or
// llama-3.3-70b-versatile. Keep this overridable via .env.local.
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
