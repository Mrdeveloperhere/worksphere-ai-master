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
    <div className={cn("flex w-full mb-1", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap transition-all",
          isUser
            ? "bg-[#E55737] text-white rounded-br-none"
            : "bg-white dark:bg-[#1A1A1D]/80 text-neutral-800 dark:text-neutral-200 border border-neutral-200/50 dark:border-neutral-800/85 rounded-bl-none"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {message.pendingAction && (
          <div className="mt-3 flex gap-2 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
            <Button
              size="sm"
              disabled={resolving}
              onClick={onConfirm}
              className="h-7 text-xs bg-[#E55737] hover:bg-[#D44626] text-white rounded-lg flex items-center gap-1 cursor-pointer border-0 shadow-2xs"
            >
              <Check className="size-3" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={resolving}
              onClick={onCancel}
              className="h-7 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <X className="size-3" /> Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
