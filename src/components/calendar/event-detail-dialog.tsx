"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { updateTask, deleteTask, moveToDraft } from "@/lib/calendar/actions";
import { EVENT_CATEGORIES, CATEGORY_LABELS } from "@/lib/calendar/constants";
import { useCalendarStore } from "@/lib/stores/calendar-store";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

export function EventDetailDialog({
  event,
  assigneeOptions,
  onClose,
}: {
  event: CalendarEventDTO | null;
  assigneeOptions: { id: string; name: string }[];
  onClose: () => void;
}) {
  const patchLocal = useCalendarStore((s) => s.patchLocal);
  const moveToDraftLocal = useCalendarStore((s) => s.moveToDraftLocal);
  const removeLocal = useCalendarStore((s) => s.removeLocal);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");

  if (!event) return null;

  async function save(patch: Partial<CalendarEventDTO>) {
    const result = await updateTask(event!.id, {
      title: patch.title,
      description: patch.description,
      priority: patch.priority,
      category: patch.category,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    patchLocal(event!.id, patch);
  }

  async function handleDelete() {
    const result = await deleteTask(event!.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    removeLocal(event!.id);
    onClose();
  }

  async function handleMoveToDraft() {
    const result = await moveToDraft(event!.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    moveToDraftLocal(event!.id);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event.isDraft ? "Draft task" : "Event details"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== event.title && save({ title })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="event-desc">Description</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                description !== (event.description ?? "") && save({ description })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={event.priority}
                onValueChange={(v) => save({ priority: v as CalendarEventDTO["priority"] })}
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
              <Label>Category</Label>
              <Select
                value={event.category}
                onValueChange={(v) =>
                  save({ category: v as CalendarEventDTO["category"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Assignee</Label>
            <Select
              value={event.assigneeId ?? "unassigned"}
              onValueChange={(v) =>
                save({ assigneeId: v === "unassigned" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
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

          {!event.isDraft && event.startTime && event.endTime && (
            <p className="text-sm text-muted-foreground">
              {new Date(event.startTime).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {new Date(event.endTime).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}

          <div className="flex gap-2">
            {!event.isDraft && (
              <Button variant="outline" onClick={handleMoveToDraft}>
                Move to drafts
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
