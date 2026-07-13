"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageDTO } from "@/lib/stores/pages-store";

export function PagesList({
  pages,
  selectedId,
  onSelect,
  onCreate,
}: {
  pages: PageDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Pages</h2>
        <Button size="icon" variant="ghost" className="size-7" onClick={onCreate}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No pages yet. Create one to get started.
          </p>
        )}
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => onSelect(page.id)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b p-3 text-left transition-colors hover:bg-muted/50",
              selectedId === page.id && "bg-muted",
            )}
          >
            <span className="truncate text-sm font-medium">{page.title}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(page.updatedAt).toLocaleDateString(undefined, {
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
