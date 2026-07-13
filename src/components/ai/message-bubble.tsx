"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessageDTO } from "@/lib/stores/ai-store";

export function MessageBubble({
  message,
  onConfirm,
  onCancel,
  resolving,
}: {
  message: ChatMessageDTO;
  onConfirm: () => void;
  onCancel: () => void;
  resolving: boolean;
}) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.pendingAction && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={resolving} onClick={onConfirm} className="h-7 gap-1">
              <Check className="size-3.5" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={resolving}
              onClick={onCancel}
              className="h-7 gap-1"
            >
              <X className="size-3.5" /> Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
