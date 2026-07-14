import "server-only";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export type AIClientResult = {
  client: OpenAI;
  model: string;
};

export async function getOpenAIClient(userId?: string): Promise<AIClientResult | null> {
  let openaiApiKey = process.env.OPENAI_API_KEY;
  let geminiApiKey = process.env.GEMINI_API_KEY;
  let aiModel = "gpt-4o";

  if (userId) {
    try {
      const settings = await prisma.settings.findUnique({
        where: { userId },
        select: {
          openaiApiKey: true,
          geminiApiKey: true,
          aiModel: true,
        },
      });
      if (settings) {
        if (settings.openaiApiKey) openaiApiKey = settings.openaiApiKey;
        if (settings.geminiApiKey) geminiApiKey = settings.geminiApiKey;
        if (settings.aiModel) aiModel = settings.aiModel;
      }
    } catch (e) {
      console.error("Failed to fetch settings from database:", e);
    }
  }

  // Route depending on model choice
  if (aiModel.startsWith("gemini")) {
    const key = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Gemini API key is not configured. Please add your Gemini API Key in Settings -> AI Settings.");
    }
    const client = new OpenAI({
      apiKey: key,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    const finalModel = aiModel === "gemini-1.5-pro" ? "gemini-2.5-pro" : aiModel;
    return { client, model: finalModel };
  }

  if (aiModel === "claude-3-5-sonnet") {
    throw new Error("Claude 3.5 Sonnet integration is coming soon. Please select Gemini 1.5 Pro or GPT-4o for now.");
  }

  // Fallback to OpenAI
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured. Please add your OpenAI API Key in Settings -> AI Settings.");
  }
  const client = new OpenAI({ apiKey: openaiApiKey });
  return { client, model: aiModel };
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
