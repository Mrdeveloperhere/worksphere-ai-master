import { ensureUser } from "@/lib/auth/ensure-user";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Runs on every authenticated dashboard load — no Clerk webhook dependency.
  await ensureUser();
  return <>{children}</>;
}
