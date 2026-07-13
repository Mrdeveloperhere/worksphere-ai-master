"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createBoard, renameBoard, recolorBoard, deleteBoard } from "@/lib/kanban/actions";

const BOARD_COLORS = [
  { value: "#A7F3D0", bgClass: "bg-[#A7F3D0]" },
  { value: "#F5D0A9", bgClass: "bg-[#F5D0A9]" },
  { value: "#FCD34D", bgClass: "bg-[#FCD34D]" },
  { value: "#BFDBFE", bgClass: "bg-[#BFDBFE]" },
  { value: "#E9D5FF", bgClass: "bg-[#E9D5FF]" },
];

export function BoardsSidebar({
  workspaceId,
  initialBoards,
}: {
  workspaceId: string;
  initialBoards: { id: string; name: string; color: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState("#A7F3D0");

  // Edit Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editBoardId, setEditBoardId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Delete Modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [deleteBoardName, setDeleteBoardName] = useState("");

  function handleCreate() {
    if (!createName.trim()) return;
    startTransition(async () => {
      const result = await createBoard(workspaceId, createName.trim(), createColor);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateColor("#A7F3D0");
      toast.success("Board created successfully!");
      router.push(`/dashboard/${workspaceId}/kanban/${result.data.id}`);
      router.refresh();
    });
  }

  function handleEdit() {
    if (!editBoardId || !editName.trim()) return;
    startTransition(async () => {
      const renameRes = await renameBoard(editBoardId, editName.trim());
      if (!renameRes.success) {
        toast.error(renameRes.error);
        return;
      }
      const colorRes = await recolorBoard(editBoardId, editColor);
      if (!colorRes.success) {
        toast.error(colorRes.error);
        return;
      }
      setEditOpen(false);
      setEditBoardId(null);
      toast.success("Board updated successfully!");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteBoardId) return;
    startTransition(async () => {
      const result = await deleteBoard(deleteBoardId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDeleteOpen(false);
      setDeleteBoardId(null);
      toast.success("Board deleted successfully!");
      router.push(`/dashboard/${workspaceId}/kanban`);
      router.refresh();
    });
  }

  return (
    <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-[#FAF8F5] dark:bg-[#0E0E10] flex flex-col h-full shrink-0">
      
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60">
        <span className="font-bold text-neutral-800 dark:text-neutral-200 tracking-tight text-xs uppercase flex items-center gap-1.5">
          <span className="size-2 bg-[#D97706] rounded-full animate-pulse" />
          Boards
        </span>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-[#B45309] hover:bg-[#92400E] text-white font-medium text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all border-0 cursor-pointer shadow-xs"
        >
          <Plus className="size-3" /> New
        </button>
      </div>

      {/* Boards List */}
      <div className="flex-grow overflow-y-auto p-3 space-y-1">
        {initialBoards.map((b) => {
          const boardHref = `/dashboard/${workspaceId}/kanban/${b.id}`;
          const isActive = pathname === boardHref;

          return (
            <div
              key={b.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? "bg-[#FEF3C7] text-[#92400E] font-semibold dark:bg-[#78350F]/20 dark:text-[#FBBF24]"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
              }`}
            >
              <Link href={boardHref} className="flex items-center gap-2.5 flex-1 min-w-0">
                <span
                  className="size-3 rounded-full shrink-0 shadow-2xs border border-white/20"
                  style={{ backgroundColor: b.color }}
                />
                <span className="truncate text-sm">{b.name}</span>
              </Link>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditBoardId(b.id);
                    setEditName(b.name);
                    setEditColor(b.color);
                    setEditOpen(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors rounded-md border-0 bg-transparent cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteBoardId(b.id);
                    setDeleteBoardName(b.name);
                    setDeleteOpen(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-red-600 transition-colors rounded-md border-0 bg-transparent cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {initialBoards.length === 0 && (
          <p className="text-xs text-neutral-400 p-3 text-center">No boards yet.</p>
        )}
      </div>

      {/* Create Board Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center justify-between">
              Create board
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">BOARD NAME</Label>
              <Input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Product launch"
                className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#B45309]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">COLOR</Label>
              <div className="flex items-center gap-3">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCreateColor(c.value)}
                    className={`size-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      createColor === c.value
                        ? "border-[#B45309] scale-110 shadow-xs"
                        : "border-transparent hover:scale-105"
                    } ${c.bgClass}`}
                  >
                    {createColor === c.value && (
                      <span className="size-2 bg-[#B45309] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              onClick={handleCreate}
              disabled={isPending || !createName.trim()}
              className="w-full bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl py-2 cursor-pointer font-semibold shadow-xs border-0"
            >
              {isPending ? "Creating..." : "Create board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
              Edit board
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">BOARD NAME</Label>
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                placeholder="Product launch"
                className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#B45309]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">COLOR</Label>
              <div className="flex items-center gap-3">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setEditColor(c.value)}
                    className={`size-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      editColor === c.value
                        ? "border-[#B45309] scale-110 shadow-xs"
                        : "border-transparent hover:scale-105"
                    } ${c.bgClass}`}
                  >
                    {editColor === c.value && (
                      <span className="size-2 bg-[#B45309] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              onClick={handleEdit}
              disabled={isPending || !editName.trim()}
              className="w-full bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl py-2 cursor-pointer font-semibold shadow-xs border-0"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Board Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              Delete board
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-neutral-500 dark:text-neutral-400">
            Are you sure you want to delete board <strong className="text-neutral-800 dark:text-neutral-200">{deleteBoardName}</strong>? All columns and tasks inside this board will be permanently deleted.
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="flex-grow rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-grow bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer border-0 shadow-xs"
            >
              {isPending ? "Deleting..." : "Delete board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
