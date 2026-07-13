import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import {
  requireWorkspaceAccess,
  tryWorkspaceAccess,
  WorkspaceAccessError,
} from "@/lib/auth/workspace-access";

// Regression-critical: this is the SINGLE shared authorization path used by
// every server action (Kanban, Calendar, AI agent). A bug here is a
// workspace-isolation bug across the whole app, not a local one.
describe("requireWorkspaceAccess", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindFirst.mockReset();
  });

  it("throws when not signed in", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(requireWorkspaceAccess("ws-1")).rejects.toThrow(WorkspaceAccessError);
  });

  it("throws when the user has no active membership in the workspace", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue(null);

    await expect(requireWorkspaceAccess("ws-1")).rejects.toThrow(
      "Not a member of this workspace",
    );
  });

  it("allows a MEMBER when no role is required", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ role: "MEMBER", userId: "user-1" });

    const result = await requireWorkspaceAccess("ws-1");
    expect(result.userId).toBe("user-1");
  });

  it("rejects a MEMBER when OWNER role is required (owner-only gating)", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ role: "MEMBER", userId: "user-1" });

    await expect(
      requireWorkspaceAccess("ws-1", { role: "OWNER" }),
    ).rejects.toThrow("Only the workspace owner can do this");
  });

  it("allows an OWNER when OWNER role is required", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ role: "OWNER", userId: "user-1" });

    const result = await requireWorkspaceAccess("ws-1", { role: "OWNER" });
    expect(result.membership.role).toBe("OWNER");
  });
});

describe("tryWorkspaceAccess", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindFirst.mockReset();
  });

  it("returns ok:false with the error message instead of throwing", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ role: "MEMBER", userId: "user-1" });

    const result = await tryWorkspaceAccess("ws-1", { role: "OWNER" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Only the workspace owner can do this");
    }
  });

  it("returns ok:true with the access details on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ role: "OWNER", userId: "user-1" });

    const result = await tryWorkspaceAccess("ws-1", { role: "OWNER" });
    expect(result.ok).toBe(true);
  });
});
