import { getCurrentUser } from "@/lib/current-user";
import {
  canManageApplication,
  canManageWorkItem,
  type DemoUser,
} from "@/lib/permissions";

export async function currentActor() {
  return getCurrentUser();
}

export function asDemoUser(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
): DemoUser {
  return { id: user.id, role: user.role, teamId: user.teamId };
}

export function canManageApplicationForUser(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  record: {
    assignedToId?: string | null;
    createdById?: string;
    teamId?: string | null;
  },
) {
  return canManageApplication(asDemoUser(user), record);
}

export function canManageWorkItemForUser(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  record: {
    assignedToId?: string | null;
    createdById?: string;
    teamId?: string | null;
  },
) {
  return canManageWorkItem(asDemoUser(user), record);
}
