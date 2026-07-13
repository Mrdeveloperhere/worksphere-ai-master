"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptInvite, declineInvite } from "@/lib/workspace/actions";

type Invite = { membershipId: string; workspaceName: string };

export function PendingInvitesBanner({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(action: typeof acceptInvite, membershipId: string) {
    startTransition(async () => {
      const result = await action(membershipId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b bg-accent/40 px-4 py-2">
      {invites.map((invite) => (
        <div
          key={invite.membershipId}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span>
            You&apos;ve been invited to <strong>{invite.workspaceName}</strong>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handle(acceptInvite, invite.membershipId)}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handle(declineInvite, invite.membershipId)}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
