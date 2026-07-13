"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import "@excalidraw/excalidraw/index.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateWhiteboard, deleteWhiteboard } from "@/lib/whiteboard/actions";
import type { WhiteboardDTO } from "@/lib/stores/whiteboard-store";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// Excalidraw touches `window` at module scope, so it can only run in the
// browser — ssr:false keeps it out of the server render entirely.
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

// Excalidraw fires onChange on every pointer move while drawing — saving on
// every call would hammer the server action. Debounce instead, and skip the
// save entirely if the scene didn't actually change (covers the
// onChange-on-mount call Excalidraw fires with the initial elements).
const AUTOSAVE_DELAY_MS = 1200;

export function WhiteboardCanvas({
  board,
  onUpdated,
  onDeleted,
}: {
  board: WhiteboardDTO;
  onUpdated: (id: string, patch: Partial<WhiteboardDTO>) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(board.title);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>(JSON.stringify(board.elements));

  async function saveTitle() {
    if (!title.trim() || title === board.title) return;
    const result = await updateWhiteboard(board.id, { title });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(board.id, { title, updatedAt: new Date().toISOString() });
  }

  function handleChange(elements: readonly ExcalidrawElement[]) {
    const serialized = JSON.stringify(elements);
    if (serialized === lastSaved.current) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      lastSaved.current = serialized;
      const result = await updateWhiteboard(board.id, {
        elements: elements as unknown[],
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onUpdated(board.id, { updatedAt: new Date().toISOString() });
    }, AUTOSAVE_DELAY_MS);
  }

  async function handleDelete() {
    const result = await deleteWhiteboard(board.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDeleted(board.id);
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void saveTitle()}
          className="h-9 flex-1 border-none text-xl font-semibold shadow-none focus-visible:ring-1"
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{board.title}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="relative flex-1">
        <Excalidraw
          initialData={{ elements: board.elements as ExcalidrawElement[] }}
          onChange={(elements) => handleChange(elements)}
        />
      </div>
    </div>
  );
}
