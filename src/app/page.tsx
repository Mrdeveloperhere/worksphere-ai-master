import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Columns3, Sparkles, BookOpen, PenTool } from "lucide-react";

const features = [
  {
    title: "AI Assistant",
    description: "Turn prompts into tasks, notes, and schedules without leaving the workspace.",
    icon: Sparkles,
  },
  {
    title: "Calendar + Kanban",
    description: "Move work from draft to committed plan with a visual flow that stays calm.",
    icon: CalendarDays,
  },
  {
    title: "Notes, pages, whiteboard",
    description: "Capture ideas fast, then expand them into reusable pages and boards.",
    icon: BookOpen,
  },
];

const steps = [
  "Plan with AI",
  "Schedule the week",
  "Track work across boards",
  "Review notes and pages",
];

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_24%),radial-gradient(circle_at_30%_70%,_rgba(34,197,94,0.10),_transparent_28%)]" />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-4 text-orange-500" />
              Flowbase workspace for planning, execution, and review
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                One workspace for the day, the week, and the next idea.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Capture tasks, shape them with AI, schedule them on the calendar, and keep the whole system feeling light instead of cluttered.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition-transform hover:-translate-y-0.5"
              >
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background/80 px-6 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
            </div>

            <div className="grid gap-3 pt-2 text-sm text-muted-foreground sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-sm backdrop-blur"
                >
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border/70 bg-background/75 p-5 shadow-2xl shadow-foreground/5 backdrop-blur-xl">
            <div className="grid gap-4 rounded-[1.5rem] bg-linear-to-br from-rose-50 via-amber-50 to-emerald-50 p-5 ring-1 ring-border/60 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today</p>
                  <p className="text-2xl font-semibold">Your workspace is ready.</p>
                </div>
                <div className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  3 active modules
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Tasks", value: "3", icon: Columns3 },
                  { label: "Calendar", value: "5", icon: CalendarDays },
                  { label: "Notes", value: "1", icon: PenTool },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                    <item.icon className="mb-3 size-5 text-foreground/70" />
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-3xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex items-start gap-4 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm"
                  >
                    <div className="rounded-xl border border-border/60 bg-background p-3 text-foreground shadow-sm">
                      <feature.icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{feature.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
