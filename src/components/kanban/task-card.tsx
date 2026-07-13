"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { KanbanTask } from "@/lib/stores/kanban-store";

const PRIORITY_STYLES: Record<KanbanTask["priority"], string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function TaskCard({
  task,
  assigneeName,
  onClick,
}: {
  task: KanbanTask;
  assigneeName?: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-3 text-sm shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-medium">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        <Badge className={cn("text-[10px]", PRIORITY_STYLES[task.priority])}>
          {task.priority}
        </Badge>
        {task.labels.map((label) => (
          <Badge key={label} variant="outline" className="text-[10px]">
            {label}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {task.dueDate ? (
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        ) : (
          <span />
        )}
        {assigneeName && (
          <Avatar className="size-5">
            <AvatarFallback className="text-[10px]">
              {assigneeName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
