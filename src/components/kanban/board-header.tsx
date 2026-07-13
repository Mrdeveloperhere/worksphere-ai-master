"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  renameBoard,
  recolorBoard,
  deleteBoard,
  getBoardDeletionImpact,
} from "@/lib/kanban/actions";

const PALETTE = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7"];

export function BoardHeader({
  board,
}: {
  board: { id: string; name: string; color: string; workspaceId: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [color, setColor] = useState(board.color);
  const [impact, setImpact] = useState<{
    columnCount: number;
    taskCount: number;
  } | null>(null);

  async function handleRecolor(next: string) {
    setColor(next);
    const result = await recolorBoard(board.id, next);
    if (!result.success) {
      toast.error(result.error);
      setColor(board.color);
    }
  }

  async function handleRename() {
    if (!name.trim() || name === board.name) return;
    const result = await renameBoard(board.id, name.trim());
    if (!result.success) toast.error(result.error);
  }

  async function loadImpact() {
    const result = await getBoardDeletionImpact(board.id);
    if (result.success) setImpact(result.data);
  }

  async function handleDelete() {
    const result = await deleteBoard(board.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push(`/dashboard/${board.workspaceId}`);
  }

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="size-4 shrink-0 rounded-full border"
            style={{ backgroundColor: color }}
            aria-label="Change board color"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex w-auto gap-1 p-2">
          {PALETTE.map((swatch) => (
            <DropdownMenuItem
              key={swatch}
              onClick={() => handleRecolor(swatch)}
              className="size-6 rounded-full p-0"
              style={{ backgroundColor: swatch }}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => e.key === "Enter" && handleRename()}
        className="h-8 w-fit border-none text-lg font-semibold shadow-none focus-visible:ring-1"
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-muted-foreground"
            onClick={loadImpact}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{board.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {impact
                ? `This will permanently delete ${impact.columnCount} column(s) and ${impact.taskCount} task(s). This can't be undone.`
                : "Loading what will be deleted…"}
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
  );
}
