"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  User,
  Key,
  Shield,
  Briefcase,
  Heart,
  Target,
  Calendar,
  Hammer,
  Eye,
  Terminal,
  Lightbulb,
  BookOpen,
  Users,
  Bell,
  Clock,
  Home,
  FileText,
  Sparkles,
  Tag,
  Percent,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Sliders,
  Settings2,
  Volume2,
  Lock,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/categories/actions";
import { cn } from "@/lib/utils";

// Lucide mapping helper for dynamic category icons
const iconMap: Record<string, React.ComponentType<any>> = {
  Home,
  BookOpen,
  Terminal,
  Briefcase,
  Calendar,
  FileText,
  Shield,
  Hammer,
  Heart,
  Eye,
  Target,
  Sparkles,
  Tag,
  Users,
  Percent,
  Clock,
  Bell,
  Lightbulb,
};

type DbCategory = {
  id: string;
  scope: string;
  name: string;
  color: string;
  icon: string;
};

type SettingsViewProps = {
  workspaceId: string;
  user: {
    name: string;
    email: string;
    image: string;
  };
  initialCategories: DbCategory[];
  limits: {
    boards: number;
    tasks: number;
    notes: number;
    spaces: number;
    whiteboards: number;
  };
};

export function SettingsView({
  workspaceId,
  user,
  initialCategories,
  limits,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "subscription" | "categories" | "ai" | "preferences" | "privacy"
  >("profile");

  // Dynamic Categories states
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [newCatScope, setNewCatScope] = useState<string>("calendar");
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatColor, setNewCatColor] = useState<string>("#5BAE91");
  const [newCatIcon, setNewCatIcon] = useState<string>("Briefcase");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  // Color options matching screenshot palette
  const colors = ["#5BAE91", "#EF806F", "#E6A23C", "#4BA3C7", "#8B7CF6", "#94A3B8"];

  // Icon options matching categories grid icons in screenshot
  const iconsList = [
    "Home",
    "BookOpen",
    "Terminal",
    "Briefcase",
    "Calendar",
    "FileText",
    "Shield",
    "Hammer",
    "Heart",
    "Eye",
    "Target",
    "Sparkles",
    "Tag",
    "Users",
    "Percent",
    "Clock",
    "Bell",
    "Lightbulb",
  ];

  // AI & preferences mock state
  const [aiAutoPunctuate, setAiAutoPunctuate] = useState(true);
  const [aiModel, setAiModel] = useState("claude-3-5-sonnet");
  const [themeMode, setThemeMode] = useState("light");
  const [privacyMode, setPrivacyMode] = useState(false);

  // Category addition or update
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (editingId) {
      const result = await updateCategory(editingId, workspaceId, {
        name: newCatName.trim(),
        scope: newCatScope,
        color: newCatColor,
        icon: newCatIcon,
      });
      if (result.success && result.data) {
        setCategories(categories.map((c) => (c.id === editingId ? (result.data as DbCategory) : c)));
        setEditingId(null);
        setNewCatName("");
        toast.success("Category updated successfully!");
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } else {
      const result = await createCategory(
        workspaceId,
        newCatScope,
        newCatName.trim(),
        newCatColor,
        newCatIcon
      );
      if (result.success && result.data) {
        setCategories([...categories, result.data as DbCategory]);
        setNewCatName("");
        toast.success("Category created successfully!");
      } else {
        toast.error(result.error || "Failed to create category");
      }
    }
  }

  // Category deletion
  async function handleDeleteCategory(id: string) {
    const result = await deleteCategory(id, workspaceId);
    if (result.success) {
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Category deleted.");
      if (editingId === id) {
        setEditingId(null);
        setNewCatName("");
      }
    } else {
      toast.error(result.error || "Failed to delete category");
    }
  }

  const renderIcon = (iconName: string, className = "size-4") => {
    const IconComponent = iconMap[iconName] || Tag;
    return <IconComponent className={className} />;
  };

  // Split categories by scope
  const calendarCats = categories.filter((c) => c.scope === "calendar");
  const taskCats = categories.filter((c) => c.scope === "task");
  const noteCats = categories.filter((c) => c.scope === "note");
  const reminderCats = categories.filter((c) => c.scope === "reminder");

  return (
    <div className="flex h-full flex-col gap-6 p-8 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200 overflow-y-auto">
      {/* Header Block */}
      <div className="space-y-1 pb-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
          <Settings2 className="size-3.5" /> Settings
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
          Tune your Flowbase workspace.
        </h1>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-2xl">
          Manage profile, plan, categories, AI defaults, privacy, and the little preferences that make the app feel like yours.
        </p>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* ================= LEFT SIDE: Sidebar Navigation Tabs ================= */}
        <div className="md:col-span-1 rounded-2xl bg-white dark:bg-[#121214]/60 border border-neutral-200/60 dark:border-neutral-800/80 p-3 space-y-1 shadow-3xs">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "subscription", label: "Subscription", icon: CreditCard },
            { id: "categories", label: "Categories", icon: Tag },
            { id: "ai", label: "AI Settings", icon: Sparkles },
            { id: "preferences", label: "Preferences", icon: Sliders },
            { id: "privacy", label: "Privacy", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer justify-start text-left",
                  active
                    ? "bg-[#FFE4E6]/70 dark:bg-[#E11D48]/10 text-[#E11D48] dark:text-[#F43F5E]"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 bg-transparent"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-[#E11D48]" : "text-neutral-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= RIGHT SIDE: Content Section ================= */}
        <div className="md:col-span-3 space-y-6">
          
          {/* TAB 1: Profile */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-200/40 dark:border-neutral-800/40 pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                    <User className="size-4" /> Profile
                  </h3>
                  <button
                    onClick={() => toast.info("Profile editing is managed securely via Clerk.")}
                    className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs border-0 flex items-center gap-1.5"
                  >
                    <Edit2 className="size-3.5" /> Edit profile
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-emerald-700 text-white font-extrabold text-lg flex items-center justify-center shadow-3xs uppercase">
                    {user.name.charAt(0) || "U"}
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-50">
                      {user.name}
                    </h2>
                    <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom security grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Security Card */}
                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#121214]/30 border border-neutral-200/50 dark:border-neutral-800/50 space-y-2">
                  <Key className="size-5 text-[#E6A23C]" />
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Account security
                  </h4>
                  <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                    Manage sign-in methods, active sessions, and multi-factor authentication (MFA) parameters securely through Clerk.
                  </p>
                </div>

                {/* Workspace Privacy Card */}
                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#121214]/30 border border-neutral-200/50 dark:border-neutral-800/50 space-y-2">
                  <Shield className="size-5 text-[#E11D48]" />
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Workspace privacy
                  </h4>
                  <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                    Keep sensitive page previews and details quieter. Limit guest sharing access to workspace items with custom privacy mode.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Subscription */}
          {activeTab === "subscription" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Left Plan panel */}
              <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-6">
                <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                  <CreditCard className="size-4.5 text-[#E11D48]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Subscription
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#E55737] bg-[#E55737]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Free
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      active
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100">
                      Free workspace
                    </h2>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                      Next billing activity: 5/18/2026
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2 flex-wrap">
                    <button
                      onClick={() => toast.info("Upgrade dialog window is simulated.")}
                      className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs border-0"
                    >
                      Upgrade Plan
                    </button>
                    <button
                      onClick={() => toast.info("Subscription management settings loading...")}
                      className="bg-white hover:bg-neutral-50 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-3xs"
                    >
                      Manage subscription
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Plan limits progress bars */}
              <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E11D48] dark:text-[#F43F5E] mb-2">
                  Free plan limits
                </h3>

                <div className="space-y-3.5">
                  {/* Boards limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>Boards</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{limits.boards} / 3</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className={cn(
                          "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300",
                          limits.boards >= 3 ? "bg-[#E55737]" : "bg-neutral-400"
                        )}
                        style={{ width: `${Math.min((limits.boards / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>Tasks</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{limits.tasks} / 25</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 bg-neutral-400"
                        style={{ width: `${Math.min((limits.tasks / 25) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Notes limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>Notes</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{limits.notes} / 10</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 bg-neutral-400"
                        style={{ width: `${Math.min((limits.notes / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Spaces limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>Spaces</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{limits.spaces} / 2</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className={cn(
                          "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300",
                          limits.spaces >= 2 ? "bg-[#E55737]" : "bg-neutral-400"
                        )}
                        style={{ width: `${Math.min((limits.spaces / 2) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Whiteboards limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>Whiteboards</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{limits.whiteboards} / 2</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className={cn(
                          "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300",
                          limits.whiteboards >= 2 ? "bg-[#E55737]" : "bg-neutral-400"
                        )}
                        style={{ width: `${Math.min((limits.whiteboards / 2) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* AI actions limit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                      <span>AI actions today</span>
                      <span className="text-neutral-800 dark:text-neutral-200">5 / 50</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 bg-neutral-400"
                        style={{ width: "10%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Categories (DYNAMIC CATEGORIES) */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              
              {/* Creator block */}
              <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-5">
                <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                  <Tag className="size-4.5 text-[#E11D48]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">
                    Dynamic Categories
                  </h3>
                </div>

                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Scope select */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Scope
                      </label>
                      <select
                        value={newCatScope}
                        onChange={(e) => setNewCatScope(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 h-8.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#E55737]"
                      >
                        <option value="calendar">Calendar events</option>
                        <option value="task">Tasks / Kanban</option>
                        <option value="note">Notes</option>
                        <option value="reminder">Reminders</option>
                      </select>
                    </div>

                    {/* Name input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Category name
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="Category name"
                          className="rounded-xl border-neutral-200 dark:border-neutral-800 text-xs h-8.5 focus-visible:ring-[#E55737]"
                        />
                        <button
                          type="submit"
                          className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-4 rounded-xl cursor-pointer shadow-xs border-0 h-8.5 flex items-center gap-1 shrink-0"
                        >
                          <Plus className="size-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Colors and Icons select grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    
                    {/* Palette picker */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Color
                      </label>
                      <div className="flex gap-2.5 items-center flex-wrap">
                        {colors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewCatColor(c)}
                            className={cn(
                              "size-6 rounded-full cursor-pointer transition-all border-2 flex items-center justify-center",
                              newCatColor === c ? "border-neutral-800 dark:border-neutral-100 scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                          >
                            {newCatColor === c && <Check className="size-3.5 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Icons grid selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Icon
                      </label>
                      <div className="grid grid-cols-9 gap-1 max-w-[280px]">
                        {iconsList.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setNewCatIcon(ic)}
                            title={ic}
                            className={cn(
                              "size-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800",
                              newCatIcon === ic
                                ? "bg-[#FFE4E6] border-[#E11D48] text-[#E11D48] dark:bg-[#E11D48]/10"
                                : "border-neutral-200/50 bg-transparent text-neutral-400 dark:border-neutral-800"
                            )}
                          >
                            {renderIcon(ic, "size-3.5")}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </form>
              </div>

              {/* Bottom active categories lists sorted by Scope */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Calendar Events */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-5 shadow-3xs space-y-4">
                  <div className="space-y-0.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Calendar events
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      Used for scheduled work and planning blocks.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {calendarCats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 bg-[#FCFAF7] dark:bg-neutral-900/30 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {renderIcon(cat.icon, "size-4")}
                          </div>
                          
                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-6.5 text-[11px] rounded-lg w-28 px-2 border-neutral-300 dark:border-neutral-700"
                              />
                              <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-600 hover:text-emerald-700 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <Check className="size-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                {cat.name}
                              </span>
                              <p className="text-[9px] font-mono text-neutral-400">{cat.color}</p>
                            </div>
                          )}
                        </div>

                        {editingId !== cat.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="size-6 text-neutral-400 hover:text-red-600 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {calendarCats.length === 0 && (
                      <p className="text-[10px] text-neutral-400 italic text-center py-2">No calendar categories.</p>
                    )}
                  </div>
                </div>

                {/* 2. Tasks / Kanban */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-5 shadow-3xs space-y-4">
                  <div className="space-y-0.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Tasks / Kanban
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      Used as task categories alongside labels.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {taskCats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 bg-[#FCFAF7] dark:bg-neutral-900/30 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {renderIcon(cat.icon, "size-4")}
                          </div>

                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-6.5 text-[11px] rounded-lg w-28 px-2 border-neutral-300 dark:border-neutral-700"
                              />
                              <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-600 hover:text-emerald-700 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <Check className="size-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                {cat.name}
                              </span>
                              <p className="text-[9px] font-mono text-neutral-400">{cat.color}</p>
                            </div>
                          )}
                        </div>

                        {editingId !== cat.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="size-6 text-neutral-400 hover:text-red-600 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {taskCats.length === 0 && (
                      <p className="text-[10px] text-neutral-400 italic text-center py-2">No task categories.</p>
                    )}
                  </div>
                </div>

                {/* 3. Notes */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-5 shadow-3xs space-y-4">
                  <div className="space-y-0.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Notes
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      Used to group notes beyond icon and color.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {noteCats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 bg-[#FCFAF7] dark:bg-neutral-900/30 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {renderIcon(cat.icon, "size-4")}
                          </div>

                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-6.5 text-[11px] rounded-lg w-28 px-2 border-neutral-300 dark:border-neutral-700"
                              />
                              <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-600 hover:text-emerald-700 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <Check className="size-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                {cat.name}
                              </span>
                              <p className="text-[9px] font-mono text-neutral-400">{cat.color}</p>
                            </div>
                          )}
                        </div>

                        {editingId !== cat.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="size-6 text-neutral-400 hover:text-red-600 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {noteCats.length === 0 && (
                      <p className="text-[10px] text-neutral-400 italic text-center py-2">No note categories.</p>
                    )}
                  </div>
                </div>

                {/* 4. Reminders */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-5 shadow-3xs space-y-4">
                  <div className="space-y-0.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Reminders
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      Used for reminder-style calendar items.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {reminderCats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 bg-[#FCFAF7] dark:bg-neutral-900/30 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {renderIcon(cat.icon, "size-4")}
                          </div>

                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-6.5 text-[11px] rounded-lg w-28 px-2 border-neutral-300 dark:border-neutral-700"
                              />
                              <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-600 hover:text-emerald-700 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <Check className="size-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600 size-6 bg-white border border-neutral-200 rounded-lg flex items-center justify-center cursor-pointer dark:bg-neutral-800 dark:border-neutral-700">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                {cat.name}
                              </span>
                              <p className="text-[9px] font-mono text-neutral-400">{cat.color}</p>
                            </div>
                          )}
                        </div>

                        {editingId !== cat.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="size-6 text-neutral-400 hover:text-red-600 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {reminderCats.length === 0 && (
                      <p className="text-[10px] text-neutral-400 italic text-center py-2">No reminder categories.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: AI Settings */}
          {activeTab === "ai" && (
            <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-6">
              <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                <Sparkles className="size-4.5 text-[#E11D48]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">
                  AI settings
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 bg-[#FCFAF7] dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Speech-to-Text Auto-Punctuation
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Let the AssemblyAI streaming engine format transcript turns and place spacing and punctuation.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAiAutoPunctuate(!aiAutoPunctuate);
                      toast.success("AI auto-punctuation preference updated.");
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative cursor-pointer border-0",
                      aiAutoPunctuate ? "bg-[#E55737]" : "bg-neutral-300 dark:bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 bg-white rounded-full absolute top-1 transition-transform",
                        aiAutoPunctuate ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Default Workspace LLM Model
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => {
                      setAiModel(e.target.value);
                      toast.success("Default workspace LLM model updated.");
                    }}
                    className="w-full text-xs font-semibold px-3.5 h-8.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#E55737]"
                  >
                    <option value="gpt-4o">GPT-4o (Default)</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Optimized)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Preferences */}
          {activeTab === "preferences" && (
            <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-6">
              <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                <Sliders className="size-4.5 text-[#E11D48]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">
                  Workspace Preferences
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Appearance Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["light", "dark", "system"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setThemeMode(mode);
                          toast.success(`Theme mode updated to: ${mode}`);
                        }}
                        className={cn(
                          "py-2 rounded-xl text-xs font-bold border capitalize cursor-pointer transition-all",
                          themeMode === mode
                            ? "bg-[#FFE4E6]/50 border-[#E11D48] text-[#E11D48] dark:bg-[#E11D48]/10"
                            : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40 bg-transparent text-neutral-500"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[#FCFAF7] dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <span>Default timezone</span>
                    <span className="text-neutral-400">UTC</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Calendar events schedule times match this setting. Timezones are managed per-workspace.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Privacy */}
          {activeTab === "privacy" && (
            <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/80 dark:bg-[#121214]/60 p-6 shadow-3xs space-y-6">
              <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                <Shield className="size-4.5 text-[#E11D48]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">
                  Workspace Privacy & Access
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 bg-[#FCFAF7] dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Enable privacy previews
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Hides note descriptions and details on dashboard widgets for non-owner teammates.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPrivacyMode(!privacyMode);
                      toast.success("Privacy mode updated.");
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative cursor-pointer border-0",
                      privacyMode ? "bg-[#E55737]" : "bg-neutral-300 dark:bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 bg-white rounded-full absolute top-1 transition-transform",
                        privacyMode ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
                  <Lock className="size-4 text-neutral-500 shrink-0" />
                  Your workspace data remains completely isolated and encrypted at rest on Neon server clusters.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
