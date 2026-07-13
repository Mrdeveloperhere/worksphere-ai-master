"use client";

import { useState, useTransition } from "react";
import { Plus, Search, Pin, Trash2, RotateCcw, Trash, FileText } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { updateNote, deleteNote } from "@/lib/notes/actions";
import type { NoteDTO } from "@/lib/stores/notes-store";

export function NotesList({
  notes,
  selectedId,
  onSelect,
  onCreate,
}: {
  notes: NoteDTO[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"desk" | "trash">("desk");
  const [isPending, startTransition] = useTransition();

  // Stats calculation
  const activeCount = notes.filter((n) => !n.isTrashed && !n.isPinned).length;
  const pinnedCount = notes.filter((n) => !n.isTrashed && n.isPinned).length;
  const trashedCount = notes.filter((n) => n.isTrashed).length;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.content.toLowerCase().includes(search.toLowerCase());
    if (viewMode === "desk") {
      return !n.isTrashed && matchesSearch;
    } else {
      return n.isTrashed && matchesSearch;
    }
  });

  function handleTogglePin(note: NoteDTO, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const nextPinned = !note.isPinned;
      const result = await updateNote(note.id, { isPinned: nextPinned });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextPinned ? "Note pinned!" : "Note unpinned!");
      note.isPinned = nextPinned; // optimistically update local object field if needed
      // Note: page revalidation handles store updating via Server Components refresh
    });
  }

  function handleTrashToggle(note: NoteDTO, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const nextTrashed = !note.isTrashed;
      const result = await updateNote(note.id, { isTrashed: nextTrashed });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextTrashed ? "Note moved to Trash!" : "Note restored!");
      if (selectedId === note.id) {
        onSelect(null);
      }
    });
  }

  function handlePermanentDelete(noteId: string, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteNote(noteId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Note permanently deleted!");
      if (selectedId === noteId) {
        onSelect(null);
      }
    });
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#FAF8F5] dark:bg-[#0E0E10]">
      
      {/* Sidebar Header Block */}
      <div className="p-4 border-b border-neutral-200/60 dark:border-neutral-800/60 space-y-3">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
          LIBRARY
        </span>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setViewMode("desk")}
            className="text-base font-bold text-neutral-800 dark:text-neutral-100 hover:opacity-80 border-0 bg-transparent cursor-pointer p-0"
          >
            Notes desk
          </button>
          <button
            onClick={onCreate}
            className="bg-[#E55737] hover:bg-[#D44626] text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all border-0 cursor-pointer shadow-xs"
          >
            <Plus className="size-3" /> New
          </button>
        </div>
        
        {/* Statistics Line */}
        <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
          {activeCount} active • {pinnedCount} pinned • {trashedCount} trashed
        </p>

        {/* Search Notes bar */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes"
            className="pl-8.5 rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 text-xs h-8.5 focus-visible:ring-[#E55737]"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-grow overflow-y-auto p-2 space-y-1.5">
        {filteredNotes.map((note) => {
          const isActive = selectedId === note.id;
          return (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`group flex flex-col gap-1 px-3 py-2.5 rounded-xl transition-all border-l-4 cursor-pointer relative ${
                isActive
                  ? "bg-[#ECFDF5] border-emerald-500 text-emerald-900 font-semibold dark:bg-[#06B6D4]/10 dark:border-cyan-500 dark:text-cyan-400"
                  : "bg-white border-transparent text-neutral-600 hover:bg-neutral-50 dark:bg-[#121214]/40 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1 rounded-md ${
                    isActive 
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}>
                    <FileText className="size-3.5" />
                  </div>
                  <span className="truncate text-xs sm:text-sm font-semibold">
                    {note.title || "Untitled note"}
                  </span>
                </div>

                {/* Actions container on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-inherit pl-2">
                  {viewMode === "desk" && (
                    <>
                      <button
                        onClick={(e) => handleTogglePin(note, e)}
                        className={`p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800 border-0 bg-transparent cursor-pointer ${
                          note.isPinned 
                            ? "text-amber-500" 
                            : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        }`}
                        title={note.isPinned ? "Unpin note" : "Pin note"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleTrashToggle(note, e)}
                        className="p-1 text-neutral-400 hover:text-red-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
                        title="Move to trash"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                  {viewMode === "trash" && (
                    <>
                      <button
                        onClick={(e) => handleTrashToggle(note, e)}
                        className="p-1 text-emerald-600 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
                        title="Restore note"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => handlePermanentDelete(note.id, e)}
                        className="p-1 text-red-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Subtext info */}
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1">
                <span className="font-semibold">Sage</span>
                <span>•</span>
                <span>
                  {new Date(note.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <p className="text-xs text-neutral-400 p-4 text-center">
            {viewMode === "desk" ? "No active notes found." : "Trash folder is empty."}
          </p>
        )}
      </div>

      {/* Trash Folder footer item */}
      <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <button
          onClick={() => setViewMode(viewMode === "desk" ? "trash" : "desk")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all border-0 cursor-pointer ${
            viewMode === "trash"
              ? "bg-[#FEF3C7] text-[#92400E] font-semibold dark:bg-[#78350F]/20 dark:text-[#FBBF24]"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash className="size-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Trash</span>
          </div>
          <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full shrink-0">
            {trashedCount}
          </span>
        </button>
      </div>

    </div>
  );
}
