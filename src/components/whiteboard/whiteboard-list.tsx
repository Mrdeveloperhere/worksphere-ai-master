"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WhiteboardDTO } from "@/lib/stores/whiteboard-store";

export function WhiteboardList({
  boards,
  selectedId,
  onSelect,
  onCreate,
}: {
  boards: WhiteboardDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Whiteboard</h2>
        <Button size="icon" variant="ghost" className="size-7" onClick={onCreate}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {boards.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No boards yet. Create one to get started.
          </p>
        )}
        {boards.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() => onSelect(board.id)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b p-3 text-left transition-colors hover:bg-muted/50",
              selectedId === board.id && "bg-muted",
            )}
          >
            <span className="truncate text-sm font-medium">{board.title}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(board.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
