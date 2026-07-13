"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace } from "@/lib/workspace/actions";

type Workspace = { id: string; name: string; role: string };

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  collapsed,
}: {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createWorkspace(name.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDialogOpen(false);
      setName("");
      router.push(`/dashboard/${result.data.id}`);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            size={collapsed ? "icon" : "default"}
          >
            {collapsed ? (
              current?.name.charAt(0).toUpperCase()
            ) : (
              <>
                <span className="truncate">{current?.name ?? "Select workspace"}</span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => router.push(`/dashboard/${w.id}`)}
              className="justify-between"
            >
              <span className="truncate">{w.name}</span>
              {w.id === currentWorkspaceId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
