"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export async function updateTheme(theme: Theme): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");
  if (!THEMES.includes(theme)) return fail("Invalid theme");

  await prisma.settings.upsert({
    where: { userId },
    update: { theme },
    create: { userId, theme },
  });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function updateSidebarCollapsed(
  collapsed: boolean,
): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");

  await prisma.settings.upsert({
    where: { userId },
    update: { sidebarCollapsed: collapsed },
    create: { userId, sidebarCollapsed: collapsed },
  });

  return ok(undefined);
}

export async function updateApiKeys(keys: {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  assemblyaiApiKey?: string;
}): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");

  await prisma.settings.upsert({
    where: { userId },
    update: {
      openaiApiKey: keys.openaiApiKey !== undefined ? keys.openaiApiKey : undefined,
      anthropicApiKey: keys.anthropicApiKey !== undefined ? keys.anthropicApiKey : undefined,
      geminiApiKey: keys.geminiApiKey !== undefined ? keys.geminiApiKey : undefined,
      assemblyaiApiKey: keys.assemblyaiApiKey !== undefined ? keys.assemblyaiApiKey : undefined,
    },
    create: {
      userId,
      openaiApiKey: keys.openaiApiKey || null,
      anthropicApiKey: keys.anthropicApiKey || null,
      geminiApiKey: keys.geminiApiKey || null,
      assemblyaiApiKey: keys.assemblyaiApiKey || null,
    },
  });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function updateAiModel(aiModel: string): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");

  await prisma.settings.upsert({
    where: { userId },
    update: { aiModel },
    create: { userId, aiModel },
  });

  revalidatePath("/dashboard");
  return ok(undefined);
}
