"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/calendar/event-card";
import { createDraftTask } from "@/lib/calendar/actions";
import { useCalendarStore } from "@/lib/stores/calendar-store";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

export function DraftPanel({
  workspaceId,
  drafts,
  onEventClick,
}: {
  workspaceId: string;
  drafts: CalendarEventDTO[];
  onEventClick: (eventId: string) => void;
}) {
  const upsertLocal = useCalendarStore((s) => s.upsertLocal);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    const result = await createDraftTask(workspaceId, title.trim());
    setCreating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    upsertLocal(result.data);
    setTitle("");
  }

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3 border-r p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Draft tasks</h3>
        <span className="text-xs text-muted-foreground">{drafts.length}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag a draft onto the calendar to schedule it.
      </p>

      <div className="flex gap-1">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New draft task"
          className="h-8 text-sm"
        />
        <Button size="icon" className="size-8 shrink-0" disabled={creating} onClick={handleCreate}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto">
        {drafts.map((draft) => (
          <EventCard key={draft.id} event={draft} onClick={() => onEventClick(draft.id)} />
        ))}
        {drafts.length === 0 && (
          <p className="text-xs text-muted-foreground">No drafts yet.</p>
        )}
      </div>
    </div>
  );
}
