"use client";

import { Columns3, CalendarDays, FileText, Sparkles, Wand2, Bot } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Columns3,
    label: "Create a task for tomorrow",
    prompt: "Create a task for tomorrow",
  },
  {
    icon: CalendarDays,
    label: "Add meeting reminder on calendar",
    prompt: "Add a meeting reminder on calendar",
  },
  {
    icon: FileText,
    label: "Summarize my notes",
    prompt: "Summarize my notes",
  },
  {
    icon: Columns3,
    label: "Create a Kanban board",
    prompt: "Create a Kanban board",
  },
  {
    icon: Sparkles,
    label: "Plan my week",
    prompt: "Plan my week",
  },
  {
    icon: Wand2,
    label: "Generate a habit tracker template",
    prompt: "Generate a habit tracker template",
  },
];

export function EmptyState({
  onPick,
  boardCount,
  noteCount,
  calendarCount,
}: {
  onPick: (prompt: string) => void;
  boardCount: number;
  noteCount: number;
  calendarCount: number;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center py-6">
      
      {/* Bot Icon Card */}
      <div className="rounded-2xl bg-[#E55737] p-4 text-white size-14 flex items-center justify-center shadow-md">
        <Bot className="size-8" />
      </div>

      {/* Title & Description */}
      <div className="space-y-2 max-w-xl">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
          AI Assistant
        </h2>
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          Ask questions, plan your day, and prepare actions for your tasks, calendar, notes, whiteboards, and generated apps.
        </p>
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-4">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onPick(s.prompt)}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-2xs hover:bg-neutral-50 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80 transition-all cursor-pointer text-xs sm:text-sm font-semibold"
          >
            <div className="bg-[#E55737]/10 p-2 rounded-lg text-[#E55737] shrink-0">
              <s.icon className="size-4.5" />
            </div>
            <span className="text-neutral-700 dark:text-neutral-300 leading-snug">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Counts Indicator */}
      <div className="w-full max-w-3xl mt-6">
        <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800 w-full" />
        <div className="flex items-center justify-center gap-8 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 mt-4 uppercase tracking-wider">
          <span>{boardCount} board{boardCount === 1 ? "" : "s"}</span>
          <span>{noteCount} note{noteCount === 1 ? "" : "s"}</span>
          <span>{calendarCount} calendar item{calendarCount === 1 ? "" : "s"}</span>
        </div>
      </div>

    </div>
  );
}
