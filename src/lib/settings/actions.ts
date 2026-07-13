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
