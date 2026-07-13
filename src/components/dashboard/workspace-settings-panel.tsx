"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  renameWorkspace,
  inviteMember,
  removeMember,
  deleteWorkspace,
  getWorkspaceDeletionImpact,
} from "@/lib/workspace/actions";

type Member = {
  id: string;
  email: string;
  role: string;
  status: string;
  userId: string | null;
};

export function WorkspaceSettingsPanel({
  workspaceId,
  workspaceName,
  isOwner,
  members,
  currentUserId,
}: {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(workspaceName);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [impact, setImpact] = useState<{
    boardCount: number;
    taskCount: number;
    memberCount: number;
  } | null>(null);

  function handleRename() {
    if (!name.trim() || name === workspaceName) return;
    startTransition(async () => {
      const result = await renameWorkspace(workspaceId, name.trim());
      if (!result.success) toast.error(result.error);
      else toast.success("Workspace renamed");
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    startTransition(async () => {
      const result = await inviteMember(workspaceId, inviteEmail.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invite sent");
      setInviteEmail("");
      router.refresh();
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      const result = await removeMember(workspaceId, membershipId);
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  async function loadImpact() {
    const result = await getWorkspaceDeletionImpact(workspaceId);
    if (result.success) setImpact(result.data);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorkspace(workspaceId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <div className="flex gap-2">
          <Input
            id="ws-name"
            value={name}
            disabled={!isOwner}
            onChange={(e) => setName(e.target.value)}
          />
          {isOwner && (
            <Button onClick={handleRename} disabled={isPending}>
              Save
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Members</h3>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span>{m.email}</span>
                <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                  {m.role}
                </Badge>
                {m.status === "INVITED" && <Badge variant="outline">Pending</Badge>}
              </div>
              {isOwner && m.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleRemove(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Input
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={isPending}>
              Invite
            </Button>
          </div>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2 rounded-md border border-destructive/50 p-4">
          <h3 className="text-sm font-medium text-destructive">Danger zone</h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-fit" onClick={loadImpact}>
                Delete workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{workspaceName}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  {impact
                    ? `This will permanently delete ${impact.boardCount} board(s), ${impact.taskCount} task(s), and remove ${impact.memberCount} member(s). This can't be undone.`
                    : "Loading what will be deleted…"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
    </div>
  );
}
