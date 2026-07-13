"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = [
  // Calendar Events
  { scope: "calendar", name: "Work", color: "#5BAE91", icon: "Briefcase" },
  { scope: "calendar", name: "Personal", color: "#EF806F", icon: "Heart" },
  { scope: "calendar", name: "Focus", color: "#4BA3C7", icon: "Target" },
  { scope: "calendar", name: "Meeting", color: "#E6A23C", icon: "Calendar" },
  // Tasks
  { scope: "task", name: "Build", color: "#E6A23C", icon: "Hammer" },
  { scope: "task", name: "Review", color: "#4BA3C7", icon: "Eye" },
  { scope: "task", name: "Admin", color: "#8B7CF6", icon: "Terminal" },
  // Notes
  { scope: "note", name: "Ideas", color: "#EF806F", icon: "Lightbulb" },
  { scope: "note", name: "Research", color: "#5BAE91", icon: "BookOpen" },
  { scope: "note", name: "Meeting Notes", color: "#E6A23C", icon: "Users" },
  // Reminders
  { scope: "reminder", name: "Reminder", color: "#8B7CF6", icon: "Bell" },
];

export async function listCategories(workspaceId: string) {
  try {
    let categories = await prisma.category.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed default categories if workspace has none yet
    if (categories.length === 0) {
      const data = DEFAULT_CATEGORIES.map((c) => ({
        workspaceId,
        scope: c.scope,
        name: c.name,
        color: c.color,
        icon: c.icon,
      }));

      await prisma.category.createMany({ data });
      categories = await prisma.category.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      });
    }

    return { success: true, data: categories };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to list categories" };
  }
}

export async function createCategory(
  workspaceId: string,
  scope: string,
  name: string,
  color: string,
  icon: string
) {
  try {
    const category = await prisma.category.create({
      data: {
        workspaceId,
        scope,
        name,
        color,
        icon,
      },
    });
    revalidatePath(`/dashboard/${workspaceId}/settings`);
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function updateCategory(
  categoryId: string,
  workspaceId: string,
  patch: { name?: string; color?: string; icon?: string }
) {
  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: patch,
    });
    revalidatePath(`/dashboard/${workspaceId}/settings`);
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteCategory(categoryId: string, workspaceId: string) {
  try {
    await prisma.category.delete({
      where: { id: categoryId },
    });
    revalidatePath(`/dashboard/${workspaceId}/settings`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}
