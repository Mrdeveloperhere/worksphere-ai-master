import "server-only";
import OpenAI from "openai";

// Shared between the chat Scheduling Agent and the Template Builder — both
// hit the same OpenAI account/key, so the "is it configured" check and
// model-name fallback live in one place.
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
