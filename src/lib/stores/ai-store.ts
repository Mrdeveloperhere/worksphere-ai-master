import { create } from "zustand";

import type { ChatMessageDTO } from "@/lib/ai/helpers";

export type { ChatMessageDTO };

type AiState = {
  messages: ChatMessageDTO[];
  setMessages: (messages: ChatMessageDTO[]) => void;
  appendLocal: (message: ChatMessageDTO) => void;
  removeLocal: (id: string) => void;
  patchMessage: (id: string, message: ChatMessageDTO) => void;
};

// Holds the current workspace's chat transcript. sendMessage() optimistically
// appends a temporary user message via appendLocal() for instant feedback,
// then replaces the whole list with the server's response (which includes
// both the real persisted user message and the assistant's reply) —
// removeLocal() is the rollback path if the server call itself fails.
export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  appendLocal: (message) => set({ messages: [...get().messages, message] }),
  removeLocal: (id) => set({ messages: get().messages.filter((m) => m.id !== id) }),
  patchMessage: (id, message) =>
    set({ messages: get().messages.map((m) => (m.id === id ? message : m)) }),
}));
