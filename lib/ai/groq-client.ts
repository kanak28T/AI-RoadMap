// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Groq Provider Client
//
// Groq exposes an OpenAI-compatible REST API, so we reuse `createOpenAI` from
// `@ai-sdk/openai` and simply point it at Groq's base URL.
//
// Set GROQ_API_KEY in your .env.local (free tier available at console.groq.com).
// ─────────────────────────────────────────────────────────────────────────────

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Shared Groq provider instance.
 *
 * Usage:
 *   import { groq } from "./groq-client";
 *   const model = groq("llama-3.3-70b-versatile");
 *
 * Available models (free tier):
 *   - "llama-3.3-70b-versatile"  — best quality, structured output support
 *   - "llama-3.1-8b-instant"     — fastest, lowest latency
 */
export const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "",
});
