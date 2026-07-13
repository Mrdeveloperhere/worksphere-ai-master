"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateTask,
  deleteTask,
  addComment,
  deleteComment,
  fetchTaskComments,
  type TaskCommentDTO,
} from "@/lib/kanban/actions";
import type { KanbanTask } from "@/lib/stores/kanban-store";

export function TaskDetailDialog({
  task,
  assigneeOptions,
  currentUserId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: KanbanTask | null;
  assigneeOptions: { id: string; name: string }[];
  currentUserId: string;
  onClose: () => void;
  onUpdated: (taskId: string, patch: Partial<KanbanTask>) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [labelsInput, setLabelsInput] = useState(task?.labels.join(", ") ?? "");
  const [comments, setComments] = useState<TaskCommentDTO[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    // Title/description/labels are seeded from `task` via the useState
    // initializers above — the parent remounts this component with a fresh
    // `key` per task, so there's no prop-to-state sync needed here. This
    // effect only subscribes to the external comments fetch.
    if (!task) return;
    void fetchTaskComments(task.id).then((result) => {
      if (result.success) setComments(result.data);
    });
  }, [task]);

  if (!task) return null;

  async function save(patch: Partial<KanbanTask>) {
    const result = await updateTask(task!.id, {
      title: patch.title,
      description: patch.description,
      priority: patch.priority,
      dueDate:
        patch.dueDate === undefined
          ? undefined
          : patch.dueDate
            ? new Date(patch.dueDate)
            : null,
      labels: patch.labels,
      assigneeId: patch.assigneeId,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(task!.id, patch);
  }

  async function handleDelete() {
    const result = await deleteTask(task!.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDeleted(task!.id);
    onClose();
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    const result = await addComment(task!.id, newComment.trim());
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNewComment("");
    const refreshed = await fetchTaskComments(task!.id);
    if (refreshed.success) setComments(refreshed.data);
  }

  async function handleDeleteComment(commentId: string) {
    const result = await deleteComment(commentId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Task details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && save({ title })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                description !== (task.description ?? "") && save({ description })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => save({ priority: v as KanbanTask["priority"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  save({ dueDate: e.target.value ? e.target.value : null })
                }
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Assignee</Label>
            <Select
              value={task.assigneeId ?? "unassigned"}
              onValueChange={(v) =>
                save({ assigneeId: v === "unassigned" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assigneeOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-labels">Labels (comma-separated)</Label>
            <Input
              id="task-labels"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              onBlur={() =>
                save({
                  labels: labelsInput
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Comments</Label>
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between text-sm">
                  <div>
                    <span className="font-medium">{c.authorName}</span>{" "}
                    <span className="text-muted-foreground">{c.content}</span>
                  </div>
                  {c.authorId === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button onClick={handleAddComment}>Send</Button>
            </div>
          </div>

          <Button variant="destructive" className="w-fit" onClick={handleDelete}>
            Delete task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
