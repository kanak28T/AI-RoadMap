// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Groq Provider Client
//
// Groq exposes an OpenAI-compatible REST API, so we reuse `createOpenAI` from
// `@ai-sdk/openai` pointed at Groq's base URL.
//
// Set GROQ_API_KEY in .env.local (free tier at console.groq.com).
// ─────────────────────────────────────────────────────────────────────────────

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Shared Groq provider instance.
 *
 * Usage:
 *   import { groq } from "@/lib/ai/groq-client";
 *   const model = groq("llama-3.3-70b-versatile");
 *
 * Available free-tier models:
 *   - "llama-3.3-70b-versatile"  — best quality, structured output support
 *   - "llama-3.1-8b-instant"     — fastest, lowest latency
 */
export const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "",
});
