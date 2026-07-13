"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { TaskCard } from "@/components/kanban/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createTask,
  renameColumn,
  deleteColumn,
  getColumnDeletionImpact,
} from "@/lib/kanban/actions";
import type { KanbanColumn } from "@/lib/stores/kanban-store";

export function Column({
  column,
  assigneeNames,
  onTaskClick,
  onTaskCreated,
  onColumnRenamed,
  onColumnDeleted,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: {
  column: KanbanColumn;
  assigneeNames: Map<string, string>;
  onTaskClick: (taskId: string) => void;
  onTaskCreated: () => void;
  onColumnRenamed: (name: string) => void;
  onColumnDeleted: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: "column" } });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);
  const [impact, setImpact] = useState<{ taskCount: number } | null>(null);

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    const result = await createTask(column.id, newTaskTitle.trim());
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNewTaskTitle("");
    onTaskCreated();
  }

  async function handleRename() {
    setRenaming(false);
    if (!name.trim() || name === column.name) return;
    const result = await renameColumn(column.id, name.trim());
    if (!result.success) {
      toast.error(result.error);
      setName(column.name);
      return;
    }
    onColumnRenamed(name.trim());
  }

  async function loadImpact() {
    const result = await getColumnDeletionImpact(column.id);
    if (result.success) setImpact(result.data);
  }

  async function handleDelete() {
    const result = await deleteColumn(column.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onColumnDeleted();
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-md border bg-muted/30">
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderTopColor: column.color }}
      >
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-7"
          />
        ) : (
          <span
            className="flex-1 truncate text-sm font-medium"
            onDoubleClick={() => setRenaming(true)}
          >
            {column.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{column.tasks.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            {canMoveLeft && (
              <DropdownMenuItem onClick={onMoveLeft}>Move left</DropdownMenuItem>
            )}
            {canMoveRight && (
              <DropdownMenuItem onClick={onMoveRight}>Move right</DropdownMenuItem>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void loadImpact();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="size-4" /> Delete column
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{column.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {impact
                      ? `This will permanently delete ${impact.taskCount} task(s) in this column.`
                      : "Loading what will be deleted…"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 p-2">
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No tasks yet
            </p>
          ) : (
            column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assigneeName={
                  task.assigneeId ? assigneeNames.get(task.assigneeId) : undefined
                }
                onClick={() => onTaskClick(task.id)}
              />
            ))
          )}
        </SortableContext>
      </div>

      <div className="flex items-center gap-1 border-t p-2">
        <Input
          placeholder="Add a task…"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
          className="h-8"
        />
        <Button size="icon" className="size-8 shrink-0" onClick={handleCreateTask}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
