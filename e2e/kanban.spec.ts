import { test, expect } from "@playwright/test";

// These specs require a real Clerk test instance and a real Neon database —
// they are not runnable in this sandbox (no credentials configured). Set
// E2E_TEST_EMAIL / E2E_TEST_PASSWORD for a pre-created Clerk test user before
// running `npm run test:e2e`. Covers the critical paths from the Phase 1
// test plan (signup → board → drag-and-drop with rollback).

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured");

test("sign in, create a board, create a task, and see it persist after refresh", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL(/\/dashboard\//);

  await page.getByRole("link", { name: /tasks \/ kanban/i }).click();
  await page.getByRole("button", { name: /new board/i }).click();
  await page.getByLabel(/name/i).fill("E2E Test Board");
  await page.getByRole("button", { name: /^create$/i }).click();

  await page.waitForURL(/\/kanban\//);

  const taskInput = page.getByPlaceholder("Add a task…").first();
  await taskInput.fill("Write the launch email");
  await taskInput.press("Enter");

  await expect(page.getByText("Write the launch email")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Write the launch email")).toBeVisible();
});

test("dragging a task to another column persists the move after refresh", async ({
  page,
}) => {
  // Assumes a board with at least two columns and one task already exists
  // from the previous test or fixture setup.
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\//);

  await page.getByRole("link", { name: /tasks \/ kanban/i }).click();
  await page.getByText("E2E Test Board").click();

  const task = page.getByText("Write the launch email");
  const targetColumn = page.getByText("In Progress").locator("..").locator("..");

  await task.dragTo(targetColumn);

  await expect(targetColumn).toContainText("Write the launch email");

  await page.reload();
  await expect(
    page.getByText("In Progress").locator("..").locator(".."),
  ).toContainText("Write the launch email");
});
