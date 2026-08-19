export type DemoUser = {
  id: string;
  role: "ADMIN" | "MANAGER" | "EXECUTIVE";
  teamId?: string | null;
};

export type ScopedRecord = {
  assignedToId?: string | null;
  createdById?: string;
  teamId?: string | null;
};

export function canManageEverything(user: DemoUser) {
  return user.role === "ADMIN";
}

export function canManageApplication(
  user: DemoUser,
  application: ScopedRecord,
) {
  if (user.role === "ADMIN") return true;
  if (user.role === "EXECUTIVE") return application.assignedToId === user.id;
  return (
    application.teamId === user.teamId || application.createdById === user.id
  );
}

export function canManageWorkItem(user: DemoUser, workItem: ScopedRecord) {
  if (user.role === "ADMIN") return true;
  if (user.role === "EXECUTIVE") return workItem.assignedToId === user.id;
  return workItem.teamId === user.teamId || workItem.createdById === user.id;
}
