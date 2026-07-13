"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Folder, Plus, Search, Star, MoreHorizontal, ChevronLeft, BookOpen, Trash2, LayoutGrid, List } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PageEditor } from "@/components/pages/page-editor";
import { createPage, createSpace, deleteSpace } from "@/lib/pages/actions";
import { usePagesStore, type PageDTO } from "@/lib/stores/pages-store";
import { type SpaceDTO } from "@/lib/pages/helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const SPACE_COLORS = [
  { value: "#BFDBFE", bgClass: "bg-[#BFDBFE]", textClass: "text-[#2563EB]" }, // Blue
  { value: "#FCD34D", bgClass: "bg-[#FCD34D]", textClass: "text-[#D97706]" }, // Gold
  { value: "#A7F3D0", bgClass: "bg-[#A7F3D0]", textClass: "text-[#059669]" }, // Green
  { value: "#FECACA", bgClass: "bg-[#FECACA]", textClass: "text-[#DC2626]" }, // Red/Rose
  { value: "#E9D5FF", bgClass: "bg-[#E9D5FF]", textClass: "text-[#7C3AED]" }, // Violet
];

export function PagesView({
  workspaceId,
  initialPages,
  initialSpaces = [],
}: {
  workspaceId: string;
  initialPages: PageDTO[];
  initialSpaces?: SpaceDTO[];
}) {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const pages = usePagesStore((s) => s.pages);
  const selectedId = usePagesStore((s) => s.selectedId);
  const setPages = usePagesStore((s) => s.setPages);
  const selectPage = usePagesStore((s) => s.selectPage);
  const upsertLocal = usePagesStore((s) => s.upsertLocal);
  const patchLocal = usePagesStore((s) => s.patchLocal);
  const removeLocal = usePagesStore((s) => s.removeLocal);

  // Spaces list state
  const [spaces, setSpaces] = useState<SpaceDTO[]>(initialSpaces);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  // Filter and view state
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "favorites" | "recent" | "archived">("all");
  const [sortMode, setSortMode] = useState<"recent" | "name">("recent");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");

  // Create Space state
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDesc, setSpaceDesc] = useState("");
  const [spaceColor, setSpaceColor] = useState("#BFDBFE");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPages(initialPages);
    
    // Hydrate selection from URL param if available
    if (queryId && initialPages.some((p) => p.id === queryId)) {
      const pageObj = initialPages.find((p) => p.id === queryId);
      if (pageObj) {
        setActiveSpaceId(pageObj.spaceId);
        selectPage(pageObj.id);
      }
    }
  }, []);

  // Update local spaces list when initialSpaces changes
  useEffect(() => {
    setSpaces(initialSpaces);
  }, [initialSpaces]);

  const activeSpace = activeSpaceId ? spaces.find((s) => s.id === activeSpaceId) ?? null : null;

  // Filtered spaces for Tier 1
  const filteredSpaces = spaces.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Filtered pages for Tier 2 (inside active space)
  const spacePages = pages.filter((p) => p.spaceId === activeSpaceId && p.title.toLowerCase().includes(search.toLowerCase()));

  async function handleCreateSpace() {
    if (!spaceName.trim()) return;
    startTransition(async () => {
      const result = await createSpace(workspaceId, spaceName.trim(), spaceDesc.trim(), spaceColor);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSpaces([...spaces, result.data]);
      setCreateSpaceOpen(false);
      setSpaceName("");
      setSpaceDesc("");
      setSpaceColor("#BFDBFE");
      toast.success("Space created successfully!");
    });
  }

  async function handleDeleteSpace(spaceId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this space? All pages inside it will be permanently deleted.")) return;
    const result = await deleteSpace(spaceId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSpaces(spaces.filter((s) => s.id !== spaceId));
    toast.success("Space deleted successfully!");
    if (activeSpaceId === spaceId) {
      setActiveSpaceId(null);
    }
  }

  async function handleCreatePage(spaceId: string | null) {
    const result = await createPage(workspaceId, spaceId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    upsertLocal(result.data);
    selectPage(result.data.id);
    toast.success("Document page created successfully!");
  }

  const selectedPage = selectedId ? pages.find((p) => p.id === selectedId) ?? null : null;

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200 overflow-y-auto">
      
      {/* Module Title Banner */}
      <div className="flex items-center gap-3">
        <div className="bg-[#F3E8FF] p-2.5 rounded-2xl text-[#8B5CF6] shadow-sm shrink-0">
          <BookOpen className="size-6" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            PAGES & SPACES
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-3xl leading-none">
            Organize every working document by space.
          </h1>
        </div>
      </div>

      {/* Unified Canvas Container */}
      <div className="rounded-3xl border border-neutral-200/60 bg-white p-5 shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 flex flex-col flex-1 min-h-0">
        
        {/* ================= TIER 3: Rich Document Editor ================= */}
        {selectedPage ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Editor Breadcrumbs Header */}
            <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-3 mb-4">
              <button
                onClick={() => selectPage(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 border-0 bg-transparent cursor-pointer p-0"
              >
                <ChevronLeft className="size-4" />
                {activeSpace ? activeSpace.name : "All Spaces"} &gt; Pages
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreatePage(activeSpaceId)}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all border-0 cursor-pointer shadow-xs"
                >
                  + New Page
                </button>
                <button className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-xl transition-all border-0 shadow-3xs cursor-pointer dark:bg-neutral-800 dark:hover:bg-neutral-700">
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>

            {/* Note Canvas */}
            <div className="flex-grow min-h-0">
              <PageEditor
                page={selectedPage}
                onUpdated={patchLocal}
                onDeleted={(id) => {
                  removeLocal(id);
                  selectPage(null);
                }}
              />
            </div>
          </div>
        ) : activeSpaceId ? (
          /* ================= TIER 2: Space Pages List Table ================= */
          <div className="flex flex-col flex-1 min-h-0">
            
            {/* Table Header / Breadcrumbs */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setActiveSpaceId(null)}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 border-0 bg-transparent cursor-pointer p-0"
                >
                  <ChevronLeft className="size-3.5" />
                  All Spaces
                </button>
                <div className="flex items-center gap-2.5">
                  <div 
                    className="size-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activeSpace?.color}15` }}
                  >
                    <Folder className="size-4" style={{ color: activeSpace?.color }} />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 leading-none">
                    {activeSpace?.name}
                  </h2>
                  <span className="text-xs text-neutral-400 font-semibold mt-0.5">
                    ({spacePages.length} pages)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreatePage(activeSpaceId)}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all border-0 cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Plus className="size-3.5" /> New Page
                </button>
                <button className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-xl transition-all border-0 shadow-3xs cursor-pointer dark:bg-neutral-800 dark:hover:bg-neutral-700">
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>

            {/* Pages Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                    <th className="py-2.5 px-3">PAGE NAME</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">UPDATED</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {spacePages.map((page) => (
                    <tr
                      key={page.id}
                      onClick={() => selectPage(page.id)}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors text-sm"
                    >
                      <td className="py-3.5 px-3 font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                        <svg className="size-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {page.title || "Untitled Document"}
                      </td>
                      <td className="py-3.5 px-3 text-neutral-400 dark:text-neutral-500 font-medium">Document</td>
                      <td className="py-3.5 px-3 text-neutral-400 dark:text-neutral-500 font-medium">
                        {new Date(page.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1 text-neutral-300 hover:text-amber-500 border-0 bg-transparent cursor-pointer">
                            <Star className="size-4" />
                          </button>
                          <button className="p-1 text-neutral-300 hover:text-neutral-500 border-0 bg-transparent cursor-pointer">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {spacePages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-neutral-400">
                        No pages inside this Space category yet. Click &quot;+ New Page&quot; to create a word file!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          /* ================= TIER 1: Spaces Folder Grid ================= */
          <div className="flex flex-col flex-1 min-h-0">
            
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 mb-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                  All Spaces
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  {spaces.length} space{spaces.length === 1 ? "" : "s"}
                </p>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateSpaceOpen(true)}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all border-0 cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Plus className="size-3.5" /> New Space
                </button>
                <button
                  onClick={() => handleCreatePage(null)}
                  className="bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200/80 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-3xs cursor-pointer dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                >
                  New Page
                </button>
              </div>
            </div>

            {/* Search, Filter & Layout bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-neutral-50/50 dark:bg-neutral-900/20 p-2.5 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search spaces or pages..."
                  className="pl-8.5 rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 text-xs h-8.5 focus-visible:ring-[#E55737]"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* View Filters */}
                <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {(["all", "favorites", "recent", "archived"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-colors ${
                        filterTab === tab
                          ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-3xs"
                          : "bg-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      }`}
                    >
                      {tab === "all" ? "All Spaces" : tab}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

                {/* Layout Select */}
                <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
                  <button
                    onClick={() => setLayoutMode("grid")}
                    className={`p-1.5 rounded-md border-0 cursor-pointer transition-colors ${
                      layoutMode === "grid" ? "bg-white text-neutral-800 shadow-3xs dark:bg-neutral-700 dark:text-neutral-200" : "text-neutral-400"
                    }`}
                  >
                    <LayoutGrid className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setLayoutMode("list")}
                    className={`p-1.5 rounded-md border-0 cursor-pointer transition-colors ${
                      layoutMode === "list" ? "bg-white text-neutral-800 shadow-3xs dark:bg-neutral-700 dark:text-neutral-200" : "text-neutral-400"
                    }`}
                  >
                    <List className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Folder Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1 flex-1">
              {filteredSpaces.map((space) => {
                const spacePagesCount = pages.filter((p) => p.spaceId === space.id).length;
                return (
                  <div
                    key={space.id}
                    onClick={() => setActiveSpaceId(space.id)}
                    className="group border border-neutral-200/60 dark:border-neutral-800/80 bg-white dark:bg-[#121214] p-5 rounded-2xl cursor-pointer hover:shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between h-40 relative"
                  >
                    <div>
                      {/* Colored Folder Icon */}
                      <div className="flex items-start justify-between">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center shadow-3xs"
                          style={{ backgroundColor: `${space.color}15` }}
                        >
                          <Folder className="size-5" style={{ color: space.color }} />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 text-neutral-300 hover:text-amber-500 border-0 bg-transparent cursor-pointer">
                            <Star className="size-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSpace(space.id, e)}
                            className="p-1 text-neutral-300 hover:text-red-500 border-0 bg-transparent cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Folder Name & Description */}
                      <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 mt-3.5 truncate">
                        {space.name}
                      </h3>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 line-clamp-2">
                        {space.description || "No description provided."}
                      </p>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5 mt-2">
                      <div className="size-5 rounded-full bg-[#E55737]/10 text-[#E55737] text-[9px] font-bold flex items-center justify-center shadow-2xs border border-white">
                        SA
                      </div>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        {spacePagesCount} page{spacePagesCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredSpaces.length === 0 && (
                <div className="col-span-full py-16 text-center text-sm text-neutral-400">
                  No spaces found. Click &quot;+ New Space&quot; to create a folder category!
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Create Space dialog */}
      <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
              Create space
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">SPACE NAME</Label>
              <Input
                autoFocus
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="Work Projects"
                className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#E55737]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">DESCRIPTION</Label>
              <Input
                value={spaceDesc}
                onChange={(e) => setSpaceDesc(e.target.value)}
                placeholder="Project plans, documents..."
                className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#E55737]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">COLOR</Label>
              <div className="flex items-center gap-3">
                {SPACE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSpaceColor(c.value)}
                    className={`size-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      spaceColor === c.value
                        ? "border-[#E55737] scale-110 shadow-xs"
                        : "border-transparent hover:scale-105"
                    } ${c.bgClass}`}
                  >
                    {spaceColor === c.value && (
                      <span className="size-2 bg-[#E55737] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              onClick={handleCreateSpace}
              disabled={isPending || !spaceName.trim()}
              className="w-full bg-[#E55737] hover:bg-[#D44626] text-white rounded-xl py-2 cursor-pointer font-semibold shadow-xs border-0"
            >
              {isPending ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
