import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDraftTasks, getScheduledEvents } from "@/lib/calendar/queries";
import { CalendarView } from "@/components/calendar/calendar-view";
import { monthGridDays } from "@/lib/calendar/date-utils";
import { getWorkspaceMembersForAssignment } from "@/lib/kanban/queries";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const days = monthGridDays(new Date());
  const [drafts, scheduled, assigneeOptions] = await Promise.all([
    getDraftTasks(workspaceId),
    getScheduledEvents(workspaceId, days[0], days[days.length - 1]),
    getWorkspaceMembersForAssignment(workspaceId),
  ]);

  return (
    <CalendarView
      workspaceId={workspaceId}
      initialEvents={[...drafts, ...scheduled]}
      assigneeOptions={assigneeOptions}
    />
  );
}
