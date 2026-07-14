"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Column } from "@/components/kanban/column";
import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKanbanStore, type KanbanColumn } from "@/lib/stores/kanban-store";
import {
  createColumn,
  moveTask,
  reorderColumns,
  renameBoard,
  recolorBoard,
  deleteBoard,
  getBoardDeletionImpact,
} from "@/lib/kanban/actions";
import { inviteMember, removeMember } from "@/lib/workspace/actions";

type BoardInfo = { id: string; name: string; color: string; workspaceId: string };

type Member = {
  id: string;
  email: string;
  role: string;
  status: string;
  userId: string | null;
};

export function KanbanBoard({
  board,
  initialColumns,
  assigneeOptions,
  currentUserId,
  isOwner = false,
  initialMembers = [],
}: {
  board: BoardInfo;
  initialColumns: KanbanColumn[];
  assigneeOptions: { id: string; name: string }[];
  currentUserId: string;
  isOwner?: boolean;
  initialMembers?: Member[];
}) {
  const router = useRouter();
  const columns = useKanbanStore((s) => s.columns);
  const setColumns = useKanbanStore((s) => s.setColumns);
  const moveTaskLocal = useKanbanStore((s) => s.moveTaskLocal);
  const reorderColumnsLocal = useKanbanStore((s) => s.reorderColumnsLocal);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");

  // Collaboration state
  const [collabOpen, setCollabOpen] = useState(false);
  const [membersList, setMembersList] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  // Board Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardName, setBoardName] = useState(board.name);
  const [boardColor, setBoardColor] = useState(board.color);
  const [impactColumnCount, setImpactColumnCount] = useState(0);
  const [impactTaskCount, setImpactTaskCount] = useState(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if board changes
  useEffect(() => {
    setBoardName(board.name);
    setBoardColor(board.color);
  }, [board]);

  async function handleOpenSettings() {
    setSettingsOpen(true);
    const res = await getBoardDeletionImpact(board.id);
    if (res.success) {
      setImpactColumnCount(res.data.columnCount);
      setImpactTaskCount(res.data.taskCount);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    
    // Rename board if changed
    if (boardName.trim() !== board.name) {
      const res = await renameBoard(board.id, boardName.trim());
      if (!res.success) {
        toast.error(res.error || "Failed to rename board");
        setIsSavingSettings(false);
        return;
      }
    }

    // Recolor board if changed
    if (boardColor !== board.color) {
      const res = await recolorBoard(board.id, boardColor);
      if (!res.success) {
        toast.error(res.error || "Failed to change board color");
        setIsSavingSettings(false);
        return;
      }
    }

    setIsSavingSettings(false);
    setSettingsOpen(false);
    toast.success("Board settings updated successfully!");
    router.refresh();
  }

  async function handleDeleteBoard() {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete the board "${board.name}"? This action cannot be undone and will delete all tasks and columns.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    const res = await deleteBoard(board.id);
    setIsDeleting(false);

    if (res.success) {
      toast.success("Board deleted successfully!");
      router.push(`/dashboard/${board.workspaceId}`);
    } else {
      toast.error(res.error || "Failed to delete board");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    setColumns(initialColumns);
  }, [board.id]);

  useEffect(() => {
    setMembersList(initialMembers);
  }, [initialMembers]);

  const assigneeNames = new Map(assigneeOptions.map((a) => [a.id, a.name]));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type?: string } | undefined;
    if (activeData?.type !== "task") return;

    const taskId = String(active.id);
    const overData = over.data.current as { type?: string } | undefined;

    let toColumnId: string;
    let toIndex: number;

    if (overData?.type === "column") {
      toColumnId = String(over.id);
      const targetColumn = columns.find((c) => c.id === toColumnId);
      toIndex = targetColumn ? targetColumn.tasks.length : 0;
    } else {
      const targetColumn = columns.find((c) =>
        c.tasks.some((t) => t.id === String(over.id)),
      );
      if (!targetColumn) return;
      toColumnId = targetColumn.id;
      toIndex = targetColumn.tasks.findIndex((t) => t.id === String(over.id));
    }

    const snapshot = columns;
    moveTaskLocal(taskId, toColumnId, toIndex);

    const result = await moveTask(taskId, toColumnId, toIndex);
    if (!result.success) {
      setColumns(snapshot);
      toast.error(result.error);
    }
  }

  async function handleCreateColumn() {
    if (!newColumnName.trim()) return;
    const result = await createColumn(board.id, newColumnName.trim());
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setColumns([
      ...columns,
      { id: result.data.id, name: newColumnName.trim(), color: "#94a3b8", position: columns.length, tasks: [] },
    ]);
    setNewColumnName("");
    toast.success("Column created!");
  }

  async function moveColumn(columnId: string, direction: -1 | 1) {
    const index = columns.findIndex((c) => c.id === columnId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const reordered = [...columns];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const orderedIds = reordered.map((c) => c.id);

    const snapshot = columns;
    reorderColumnsLocal(orderedIds);

    const result = await reorderColumns(board.id, orderedIds);
    if (!result.success) {
      setColumns(snapshot);
      toast.error(result.error);
    }
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    startTransition(async () => {
      const result = await inviteMember(board.workspaceId, inviteEmail.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invite sent successfully!");
      setInviteEmail("");
      router.refresh();
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      const result = await removeMember(board.workspaceId, membershipId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Member removed");
      router.refresh();
    });
  }

  const activeTask = activeTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === activeTaskId) ?? null
    : null;

  const columnCount = columns.length;
  const taskCount = columns.reduce((acc, col) => acc + col.tasks.length, 0);

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200">
      
      {/* Page Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-3xl">
          Shape the work as it moves.
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Add tasks and columns, drag items between phases, and track your team's velocity.
        </p>
      </div>

      {/* Active Board Workspace Container */}
      <div className="rounded-3xl border border-neutral-200/60 bg-white p-5 shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 flex flex-col flex-1 min-h-0">
        
        {/* Active Board Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200/60 dark:border-neutral-800/60 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="size-3 rounded-full shrink-0 border border-white/20 shadow-2xs"
                style={{ backgroundColor: board.color }}
              />
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 leading-none">
                {board.name}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 font-medium mt-1">
              {columnCount} column{columnCount === 1 ? "" : "s"} • {taskCount} task{taskCount === 1 ? "" : "s"}
            </p>
            
            {/* Collaborators */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-1">
                {assigneeOptions.slice(0, 3).map((a) => {
                  const initials = a.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={a.id}
                      className="size-6 rounded-full bg-[#B45309]/10 text-[#B45309] font-bold text-[10px] flex items-center justify-center border border-white dark:border-neutral-900 shadow-2xs"
                      title={a.name}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                {assigneeOptions.length} active now
              </span>
            </div>
          </div>

          {/* Right Actions & Creator */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCollabOpen(true)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all border-0 shadow-2xs cursor-pointer dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 h-9"
            >
              <svg className="size-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Collaboration
            </button>
            
            <button
              onClick={handleOpenSettings}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl transition-all border-0 shadow-2xs cursor-pointer dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center h-9"
            >
              <svg className="size-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <div className="flex items-center gap-2">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateColumn()}
                placeholder="New column name..."
                className="h-9 w-36 rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 text-xs focus-visible:ring-[#B45309]"
              />
              <button
                onClick={handleCreateColumn}
                className="bg-[#B45309] hover:bg-[#92400E] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border-0 cursor-pointer shadow-xs shrink-0 flex items-center gap-1 h-9"
              >
                + Column
              </button>
            </div>
          </div>
        </div>

        {/* Board Columns horizontal scroll area */}
        <DndContext
          sensors={sensors}
          onDragEnd={(e) => {
            void handleDragEnd(e);
          }}
        >
          <div className="flex flex-1 gap-4 overflow-x-auto pb-2 min-h-0 items-start">
            {columns.map((column, index) => (
              <Column
                key={column.id}
                column={column}
                assigneeNames={assigneeNames}
                onTaskClick={(taskId) => setActiveTaskId(taskId)}
                onTaskCreated={() => {}}
                onColumnRenamed={(name) =>
                  setColumns(
                    columns.map((c) => (c.id === column.id ? { ...c, name } : c)),
                  )
                }
                onColumnDeleted={() =>
                  setColumns(columns.filter((c) => c.id !== column.id))
                }
                canMoveLeft={index > 0}
                canMoveRight={index < columns.length - 1}
                onMoveLeft={() => moveColumn(column.id, -1)}
                onMoveRight={() => moveColumn(column.id, 1)}
              />
            ))}

            {columns.length === 0 && (
              <div className="flex-grow py-12 text-center text-sm text-neutral-400 self-center">
                No columns yet. Type a name in the box above to create a column.
              </div>
            )}
          </div>
        </DndContext>

      </div>

      {/* Collaboration / Member Management Dialog */}
      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <svg className="size-5 text-[#B45309]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Collaboration & Sharing
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invite Form */}
            {isOwner && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Invite Teammate</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#B45309] text-sm h-9"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={isPending || !inviteEmail.trim()}
                    className="bg-[#B45309] hover:bg-[#92400E] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all border-0 cursor-pointer shadow-xs shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed h-9"
                  >
                    Invite
                  </button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Workspace Members</Label>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {membersList.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 px-3 py-2.5 text-xs sm:text-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold text-neutral-700 dark:text-neutral-300">{m.email}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                          m.role === "OWNER"
                            ? "bg-[#FEF3C7] text-[#92400E] dark:bg-[#78350F]/30 dark:text-[#FBBF24]"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}>
                          {m.role}
                        </span>
                        {m.status === "INVITED" && (
                          <span className="text-[9px] uppercase font-bold bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 px-1.5 py-0.5 rounded-sm">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwner && m.userId !== currentUserId && (
                      <button
                        disabled={isPending}
                        onClick={() => handleRemove(m.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-lg border-0 bg-transparent cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Board Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <svg className="size-5 text-[#E55737]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Board Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* Rename Board */}
            <div className="space-y-1.5">
              <Label htmlFor="boardName" className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Board Name
              </Label>
              <Input
                id="boardName"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Enter board name..."
                className="h-10 rounded-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 focus-visible:ring-[#E55737]"
              />
            </div>

            {/* Board Color Theme */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Board Theme Color
              </Label>
              <div className="flex items-center gap-3">
                {[
                  { value: "#6366f1", name: "Indigo" },
                  { value: "#3b82f6", name: "Blue" },
                  { value: "#10b981", name: "Emerald" },
                  { value: "#8b5cf6", name: "Purple" },
                  { value: "#f43f5e", name: "Rose" },
                  { value: "#e55737", name: "Coral (Brand)" }
                ].map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setBoardColor(c.value)}
                    className={cn(
                      "size-8 rounded-full border-2 transition-all cursor-pointer",
                      boardColor === c.value
                        ? "border-[#E55737] scale-110 shadow-sm"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Delete Board Section */}
            {isOwner && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Danger Zone</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Permanently delete this board along with its <strong className="text-neutral-800 dark:text-neutral-200">{impactColumnCount} columns</strong> and <strong className="text-neutral-800 dark:text-neutral-200">{impactTaskCount} tasks</strong>. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleDeleteBoard}
                  disabled={isDeleting}
                  className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2 rounded-xl border-0 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Delete Board
                </button>
              </div>
            )}

            {/* Save / Cancel buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSettingsOpen(false)}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs px-4 py-2 rounded-xl border-0 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings || !boardName.trim()}
                className="bg-[#E55737] hover:bg-[#D44626] text-white font-bold text-xs px-4 py-2 rounded-xl border-0 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingSettings ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        key={activeTask?.id ?? "none"}
        task={activeTask}
        assigneeOptions={assigneeOptions}
        currentUserId={currentUserId}
        onClose={() => setActiveTaskId(null)}
        onUpdated={(taskId, patch) =>
          setColumns(
            columns.map((c) => ({
              ...c,
              tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
            })),
          )
        }
        onDeleted={(taskId) =>
          setColumns(
            columns.map((c) => ({
              ...c,
              tasks: c.tasks.filter((t) => t.id !== taskId),
            })),
          )
        }
      />
    </div>
  );
}
