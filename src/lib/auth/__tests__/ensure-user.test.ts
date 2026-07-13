import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCurrentUser = vi.fn();
const mockUserUpsert = vi.fn();
const mockUpdateMany = vi.fn();
const mockSettingsUpsert = vi.fn();
const mockMemberCount = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => mockCurrentUser(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { upsert: (...args: unknown[]) => mockUserUpsert(...args) },
    workspaceMember: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      count: (...args: unknown[]) => mockMemberCount(...args),
    },
    settings: { upsert: (...args: unknown[]) => mockSettingsUpsert(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { ensureUser } from "@/lib/auth/ensure-user";

function clerkUser(overrides: Partial<{ id: string; email: string }> = {}) {
  const id = overrides.id ?? "clerk_user_1";
  const email = overrides.email ?? "alice@example.com";
  return {
    id,
    primaryEmailAddressId: "email_1",
    emailAddresses: [{ id: "email_1", emailAddress: email }],
    firstName: "Alice",
    lastName: "Smith",
    imageUrl: "https://example.com/avatar.png",
  };
}

// Regression-critical: ensureUser() is called on every authenticated
// dashboard load with no Clerk webhook. Two tabs/devices completing first
// login at the same instant must not create duplicate user rows.
describe("ensureUser", () => {
  beforeEach(() => {
    mockCurrentUser.mockReset();
    mockUserUpsert.mockReset();
    mockUpdateMany.mockReset();
    mockSettingsUpsert.mockReset();
    mockMemberCount.mockReset();
    mockTransaction.mockReset();
  });

  it("uses an atomic upsert keyed on the Clerk user ID, not check-then-create", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser());
    mockUserUpsert.mockResolvedValue({ id: "clerk_user_1", email: "alice@example.com" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockSettingsUpsert.mockResolvedValue({});
    mockMemberCount.mockResolvedValue(1); // already has a workspace — skip provisioning

    await ensureUser();

    expect(mockUserUpsert).toHaveBeenCalledTimes(1);
    const call = mockUserUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ id: "clerk_user_1" });
  });

  it("links pending invites sent to this email before first login", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser({ email: "bob@example.com" }));
    mockUserUpsert.mockResolvedValue({ id: "clerk_user_2", email: "bob@example.com" });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockSettingsUpsert.mockResolvedValue({});
    mockMemberCount.mockResolvedValue(1);

    await ensureUser();

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { email: "bob@example.com", userId: null },
      data: { userId: "clerk_user_2" },
    });
  });

  it("treats a concurrent default-workspace provisioning race as a no-op, not a crash", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser());
    mockUserUpsert.mockResolvedValue({ id: "clerk_user_1", email: "alice@example.com" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockSettingsUpsert.mockResolvedValue({});
    mockMemberCount.mockResolvedValue(0); // brand new user — triggers provisioning

    // Simulate the losing side of the race: another concurrent request
    // already created the deterministic default-workspace row first.
    mockTransaction.mockRejectedValue({ code: "P2002" });

    await expect(ensureUser()).resolves.not.toThrow();
  });

  it("re-throws unexpected errors during provisioning instead of swallowing them", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser());
    mockUserUpsert.mockResolvedValue({ id: "clerk_user_1", email: "alice@example.com" });
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockSettingsUpsert.mockResolvedValue({});
    mockMemberCount.mockResolvedValue(0);

    mockTransaction.mockRejectedValue(new Error("connection reset"));

    await expect(ensureUser()).rejects.toThrow("connection reset");
  });
});
