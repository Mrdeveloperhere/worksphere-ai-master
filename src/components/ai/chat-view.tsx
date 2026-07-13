"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Bot, Mic, Sparkles } from "lucide-react";

import { MessageBubble } from "@/components/ai/message-bubble";
import { EmptyState } from "@/components/ai/empty-state";
import { sendMessage, confirmAction, cancelAction } from "@/lib/ai/actions";
import { useAiStore, type ChatMessageDTO } from "@/lib/stores/ai-store";

export function ChatView({
  workspaceId,
  initialMessages,
  boardCount = 0,
  noteCount = 0,
  calendarCount = 0,
}: {
  workspaceId: string;
  initialMessages: ChatMessageDTO[];
  boardCount?: number;
  noteCount?: number;
  calendarCount?: number;
}) {
  const messages = useAiStore((s) => s.messages);
  const setMessages = useAiStore((s) => s.setMessages);
  const appendLocal = useAiStore((s) => s.appendLocal);
  const removeLocal = useAiStore((s) => s.removeLocal);
  const patchMessage = useAiStore((s) => s.patchMessage);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
    // Hydrate once on mount; the store is the source of truth afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    appendLocal({
      id: tempId,
      role: "USER",
      content: text.trim(),
      pendingAction: null,
      createdAt: new Date().toISOString(),
    });

    const result = await sendMessage(workspaceId, text.trim());
    setSending(false);

    if (!result.success) {
      removeLocal(tempId);
      toast.error(result.error);
      return;
    }
    setMessages(result.data);
  }

  async function handleConfirm(messageId: string) {
    setResolvingId(messageId);
    const result = await confirmAction(workspaceId, messageId);
    setResolvingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    patchMessage(messageId, result.data);
    toast.success("Done");
  }

  async function handleCancel(messageId: string) {
    setResolvingId(messageId);
    const result = await cancelAction(workspaceId, messageId);
    setResolvingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    patchMessage(messageId, result.data);
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200">
      
      {/* Header section */}
      <div className="flex flex-col gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-[#E55737] dark:text-[#F87171] font-semibold text-xs uppercase tracking-wider">
          <Bot className="size-4" />
          AI Assistant
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-3xl">
          Chat, plan, and act across your workspace.
        </h1>
      </div>

      {/* Main Chat Feed */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/60 bg-white/60 dark:border-neutral-800/80 dark:bg-[#121214]/60 shadow-xs">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 ? (
            <EmptyState
              onPick={(prompt) => void handleSend(prompt)}
              boardCount={boardCount}
              noteCount={noteCount}
              calendarCount={calendarCount}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  resolving={resolvingId === message.id}
                  onConfirm={() => handleConfirm(message.id)}
                  onCancel={() => handleCancel(message.id)}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Dynamic Chat Input Block */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 bg-[#FBF9F6]/40 dark:bg-[#0C0C0D]/40">
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs dark:border-neutral-800 dark:bg-[#121214]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder="Ask me to create a task or schedule something…"
              disabled={sending}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 w-full text-sm dark:text-neutral-200 focus:outline-none"
            />
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E55737] dark:text-[#F87171] opacity-90">
                <Sparkles className="size-3.5 text-[#E55737]" />
                Actions require confirmation before saving.
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Voice typing feature is coming soon!")}
                  className="bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] font-semibold text-[11px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all border-0 shadow-2xs cursor-pointer"
                >
                  <Mic className="size-3.5" />
                  Talk
                </button>
                <button
                  disabled={sending || !input.trim()}
                  onClick={() => handleSend(input)}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white p-1.5 rounded-xl shadow-xs transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed size-8 flex items-center justify-center shrink-0"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
