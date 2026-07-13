"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Flame, Trash2, Mic, Eye, Plus, CheckSquare, PlusCircle } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useSidebarAppsStore, type SidebarApp } from "@/lib/stores/sidebar-apps-store";

type GeneratedApp = {
  id: string;
  name: string;
  description: string;
  color: string;
  metricLabel: string;
  items: { text: string; done: boolean }[];
  createdAt: string;
};

const DEFAULT_APPS: GeneratedApp[] = [
  {
    id: "habitflow-default",
    name: "HabitFlow",
    description: "Daily habit tracking and consistency monitor.",
    color: "#E55737",
    metricLabel: "Daily Goal Completion",
    items: [
      { text: "Morning Meditation", done: true },
      { text: "Read 20 pages", done: false },
      { text: "Drink 2L Water", done: false },
    ],
    createdAt: "May 18, 2026",
  },
];

export function TemplateBuilderView({ workspaceId }: { workspaceId: string }) {
  // Plan states
  const [isPro, setIsPro] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // Apps list (stored locally & synced to state)
  const [savedApps, setSavedApps] = useState<GeneratedApp[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("worksphere-generated-apps");
      return stored ? JSON.parse(stored) : DEFAULT_APPS;
    }
    return DEFAULT_APPS;
  });

  // Selected app for the right preview panel
  const [selectedAppId, setSelectedAppId] = useState<string>("habitflow-default");
  
  // Custom item adder state
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Sidebar pin state
  const { apps: pinnedSidebarApps, addApp, removeApp } = useSidebarAppsStore();

  // Save apps list to localStorage on changes
  useEffect(() => {
    localStorage.setItem("worksphere-generated-apps", JSON.stringify(savedApps));
  }, [savedApps]);

  // Sync selectedAppId if the app is deleted
  const selectedApp = savedApps.find((a) => a.id === selectedAppId) ?? savedApps[0] ?? null;

  function handleGenerate() {
    if (!prompt.trim()) return;

    if (!isPro) {
      // Show warning banner (free account check)
      return;
    }

    setGenerating(true);

    setTimeout(() => {
      // Parse prompt to dynamically create a nice theme
      const name = prompt.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      let description = `Custom productivity tracker for "${prompt.trim()}".`;
      let metricLabel = "Completion Momentum";
      let initialItems = [
        { text: "Initialize Setup", done: true },
        { text: "Review Weekly Progress", done: false },
        { text: "Share report with team", done: false },
      ];
      let color = "#E55737"; // default red-orange

      if (prompt.toLowerCase().includes("budget") || prompt.toLowerCase().includes("expense") || prompt.toLowerCase().includes("finance")) {
        description = "Personal budget tracking and expense monitor.";
        metricLabel = "Monthly Budget Spent";
        initialItems = [
          { text: "Groceries - $150", done: true },
          { text: "Rent - $1200", done: false },
          { text: "Coffee - $5", done: false },
        ];
        color = "#10B981"; // green
      } else if (prompt.toLowerCase().includes("meal") || prompt.toLowerCase().includes("food") || prompt.toLowerCase().includes("diet")) {
        description = "Weekly meal planner and grocery list.";
        metricLabel = "Meals Prepared";
        initialItems = [
          { text: "Breakfast: Oatmeal", done: true },
          { text: "Lunch: Chicken Salad", done: false },
          { text: "Dinner: Salmon", done: false },
        ];
        color = "#F59E0B"; // gold/yellow
      } else if (prompt.toLowerCase().includes("study") || prompt.toLowerCase().includes("course") || prompt.toLowerCase().includes("learn")) {
        description = "Learning schedule and study objectives log.";
        metricLabel = "Syllabus Progress";
        initialItems = [
          { text: "Read Chapter 1", done: true },
          { text: "Watch Module 2 Video", done: false },
          { text: "Complete Quiz 1", done: false },
        ];
        color = "#8B5CF6"; // purple
      }

      const newApp: GeneratedApp = {
        id: `app-${Date.now()}`,
        name,
        description,
        color,
        metricLabel,
        items: initialItems,
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      setSavedApps([newApp, ...savedApps]);
      setSelectedAppId(newApp.id);
      setPrompt("");
      setGenerating(false);
      toast.success(`${name} generated successfully!`);
    }, 1200);
  }

  function handleDeleteApp(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const appToDelete = savedApps.find((a) => a.id === id);
    if (!appToDelete) return;
    setSavedApps(savedApps.filter((a) => a.id !== id));
    removeApp(id); // unpin from sidebar if pinned
    toast.success(`${appToDelete.name} deleted.`);
  }

  // Handle checking checklist items in the previewer
  function handleToggleItem(itemIndex: number) {
    if (!selectedApp) return;
    const updatedItems = selectedApp.items.map((item, idx) => 
      idx === itemIndex ? { ...item, done: !item.done } : item
    );
    
    setSavedApps(savedApps.map((a) => 
      a.id === selectedApp.id ? { ...a, items: updatedItems } : a
    ));
  }

  // Handle adding checklist items in the previewer
  function handleAddChecklistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedApp || !newChecklistItem.trim()) return;

    const newItem = { text: newChecklistItem.trim(), done: false };
    const updatedItems = [...selectedApp.items, newItem];

    setSavedApps(savedApps.map((a) => 
      a.id === selectedApp.id ? { ...a, items: updatedItems } : a
    ));
    setNewChecklistItem("");
    toast.success("Checklist item added.");
  }

  // Handle sidebar pin toggling
  function handleToggleSidebarPin(app: GeneratedApp) {
    const isPinned = pinnedSidebarApps.some((a) => a.id === app.id);
    if (isPinned) {
      removeApp(app.id);
      toast.success(`${app.name} removed from sidebar.`);
    } else {
      addApp({
        id: app.id,
        name: app.name,
        color: app.color,
        icon: "Flame",
      });
      toast.success(`${app.name} was added to the sidebar.`);
    }
  }

  // Calculate dynamic completion %
  const completedCount = selectedApp?.items.filter(i => i.done).length ?? 0;
  const totalCount = selectedApp?.items.length ?? 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const searchParams = useSearchParams();
  const appParam = searchParams.get("app");

  // Check if active page parameter selects a specific app
  useEffect(() => {
    if (appParam && savedApps.some((a) => a.id === appParam)) {
      setSelectedAppId(appParam);
    }
  }, [appParam, savedApps]);

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200 overflow-y-auto">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFE4E6] p-2.5 rounded-2xl text-[#E11D48] shadow-sm shrink-0">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
              <Flame className="size-3" /> AI Template Builder
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-3xl leading-none">
              Turn a prompt into a single-page productivity app.
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Generate trackers, planners, dashboards, and lightweight templates as private JSON-powered mini apps.
            </p>
          </div>
        </div>

        {/* Pro Plan Simulation Toggle */}
        <button
          onClick={() => {
            setIsPro(!isPro);
            toast.success(isPro ? "Switched to Free Plan simulation." : "Simulated Pro Plan Upgrade active!");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer ${
            isPro
              ? "bg-[#FEF3C7] border border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200"
          }`}
        >
          {isPro ? "★ Active Plan: Pro (Simulated)" : "★ Upgrade to Pro (Simulate)"}
        </button>
      </div>

      {/* Main Split Panel View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ================= LEFT SIDE: Generator Box & Saved Apps List ================= */}
        <div className="space-y-6">
          
          {/* Prompt card */}
          <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 space-y-4">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
              What do you want to build?
            </h2>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Build a cozy weekly meal planner with grocery list, nutrition goals, and prep tasks."
              className="min-h-28 rounded-2xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900/40 text-xs focus-visible:ring-[#E55737] resize-none"
            />
            <p className="text-[10px] text-neutral-400 font-semibold leading-normal">
              Gemini will return structured JSON, then Flowbase renders it as a single-page app preview.
            </p>

            {/* Validation Banner (if free) */}
            {!isPro && prompt.trim() && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-red-500" />
                AI Template Builder is available on the Pro plan.
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full bg-[#E55737] hover:bg-[#D44626] text-white rounded-2xl py-2 cursor-pointer font-semibold shadow-xs flex items-center justify-center gap-1.5 border-0 h-9"
            >
              <Sparkles className="size-4" />
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>

          {/* Saved templates list card */}
          <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                  Created apps
                </h2>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase mt-0.5">
                  Your generated templates are private to your account.
                </p>
              </div>
              <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2.5 py-1 rounded-full">
                {savedApps.length} saved
              </span>
            </div>

            <div className="space-y-3">
              {savedApps.map((app) => {
                const isSelected = selectedAppId === app.id;
                const isPinned = pinnedSidebarApps.some((a) => a.id === app.id);
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-[#E55737] bg-[#E55737]/5 dark:bg-[#E55737]/10"
                        : "border-neutral-200/60 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-[#121214]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="size-8 rounded-lg flex items-center justify-center shrink-0 shadow-3xs"
                        style={{ backgroundColor: `${app.color}15` }}
                      >
                        <Flame className="size-5.5" style={{ color: app.color }} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">
                            {app.name}
                          </h3>
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: `${app.color}15`, color: app.color }}
                          >
                            {app.color}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-1">
                          {app.description}
                        </p>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                          Created {app.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedAppId(app.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-3xs border border-neutral-200/60 dark:border-neutral-800 cursor-pointer ${
                          isSelected
                            ? "bg-neutral-800 text-white dark:bg-neutral-700"
                            : "bg-white hover:bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                        }`}
                      >
                        <Eye className="size-3" /> Preview
                      </button>

                      <button
                        onClick={() => handleToggleSidebarPin(app)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200/60 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                      >
                        <PlusCircle className="size-3" />
                        {isPinned ? "Remove Sidebar" : "Add to Sidebar"}
                      </button>

                      <button
                        onClick={(e) => handleDeleteApp(app.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-red-500 border border-neutral-200/60 dark:bg-neutral-900 dark:border-neutral-800 text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer ml-auto"
                      >
                        <Trash2 className="size-3" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {savedApps.length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-6">
                  No generated template apps saved yet. Type a prompt above and click generate to create one!
                </p>
              )}
            </div>

          </div>

        </div>

        {/* ================= RIGHT SIDE: Interactive Preview Screen ================= */}
        {selectedApp ? (
          <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="size-10 rounded-xl flex items-center justify-center shadow-3xs border border-white"
                  style={{ backgroundColor: `${selectedApp.color}15` }}
                >
                  <Flame className="size-5.5" style={{ color: selectedApp.color }} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none">
                    FUNCTIONAL GENERATED APP
                  </span>
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 leading-none">
                    {selectedApp.name}
                  </h2>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {selectedApp.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toast.info("View History feature is coming soon!")}
                className="bg-white hover:bg-neutral-50 border border-neutral-200/70 text-neutral-600 font-semibold text-[10px] px-3.5 py-1.5 rounded-lg transition-all shadow-3xs cursor-pointer dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
              >
                View History
              </button>
            </div>

            {/* Today's Momentum Widget */}
            <div className="p-5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/40 dark:border-neutral-800/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <span>{selectedApp.metricLabel}</span>
                <span className="text-neutral-800 dark:text-neutral-100 font-extrabold">{completionPercentage}%</span>
              </div>
              
              {/* Custom styled progress slider */}
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 animate-transition-all"
                    style={{ width: `${completionPercentage}%`, backgroundColor: selectedApp.color }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={completionPercentage}
                  readOnly
                  className="w-full absolute top-0.5 opacity-0 cursor-default"
                />
              </div>
            </div>

            {/* Active Habits list component */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                  Active Tasks / Habits
                </h3>
              </div>

              {/* Add items form */}
              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add checklist item"
                  className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900/40 text-xs h-8.5 focus-visible:ring-[#E55737]"
                />
                <button
                  type="submit"
                  disabled={!newChecklistItem.trim()}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-3.5 rounded-xl border-0 cursor-pointer shadow-xs shrink-0 flex items-center justify-center h-8.5"
                >
                  + Add
                </button>
              </form>

              {/* Checkboxes items list */}
              <div className="space-y-1.5">
                {selectedApp.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleItem(idx)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-[#121214]/60 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all cursor-pointer"
                  >
                    <div 
                      className={`size-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        item.done 
                          ? "bg-[#E55737] border-[#E55737] text-white" 
                          : "border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {item.done && (
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${item.done ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {item.text}
                    </span>
                  </div>
                ))}

                {selectedApp.items.length === 0 && (
                  <p className="text-[11px] text-neutral-400 py-3 text-center">
                    Checklist is empty. Add a new item to get started!
                  </p>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200/60 bg-white p-12 text-center text-neutral-400 dark:border-neutral-800/80 dark:bg-[#121214]/60 flex flex-col items-center justify-center gap-2">
            <Sparkles className="size-8 text-neutral-300" />
            <p className="text-sm">Create or select a generated app to preview it here.</p>
          </div>
        )}

      </div>

    </div>
  );
}
