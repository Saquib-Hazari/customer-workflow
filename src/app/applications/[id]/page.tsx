"use client";

import { type FormEvent, useEffect, useState } from "react";

type Application = {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  syncStatus: "NOT_REQUIRED" | "PENDING" | "SYNCED" | "FAILED";
  syncAttempts: number;
  lastSyncError: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  workItems: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    assignedTo: {
      id: string;
      name: string;
    } | null;
  }[];
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    performedBy: {
      name: string;
    };
  }[];
};
type User = { id: string; name: string; role: string };

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);
  const [workItemError, setWorkItemError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    async function loadApplication() {
      const { id } = await params;
      const response = await fetch(`/api/applications/${id}`);

      if (!response.ok) {
        setApplication(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setApplication(data);
      setLoading(false);
      const usersResponse = await fetch("/api/users");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
      const meResponse = await fetch("/api/auth/me");
      if (meResponse.ok) setCurrentUser((await meResponse.json()).user);
    }

    loadApplication();
  }, [params]);

  const allowedTransitions: Record<string, string[]> = {
    NEW: ["WAITING_FOR_INFORMATION", "IN_PROGRESS"],
    WAITING_FOR_INFORMATION: ["IN_PROGRESS"],
    IN_PROGRESS: ["WAITING_FOR_INFORMATION", "UNDER_REVIEW"],
    UNDER_REVIEW: ["IN_PROGRESS", "COMPLETED"],
    COMPLETED: [],
  };

  async function changeStatus(nextStatus: string) {
    if (!application) return;

    setChangingStatus(nextStatus);
    setStatusError(null);

    try {
      const response = await fetch(
        `/api/applications/${application.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nextStatus,
            performedById: currentUser?.id ?? application.createdBy.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to change application status");
      }

      setApplication(data);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to change application status",
      );
    } finally {
      setChangingStatus(null);
    }
  }

  async function retrySynchronization() {
    if (!application) return;

    setRetryingSync(true);
    setSyncError(null);

    try {
      const response = await fetch(`/api/applications/${application.id}/sync`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to synchronize application");
      }

      const refreshed = await fetch(`/api/applications/${application.id}`);
      if (!refreshed.ok) {
        throw new Error(
          "Synchronization completed, but the application could not be refreshed",
        );
      }
      setApplication(await refreshed.json());
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Unable to synchronize application",
      );
    } finally {
      setRetryingSync(false);
    }
  }

  async function updateAssignment(assignedToId: string) {
    if (!application) return;
    setSavingAssignment(true);
    setAssignmentError(null);
    const response = await fetch(
      `/api/applications/${application.id}/assignment`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: assignedToId || null,
          performedById: currentUser?.id ?? application.createdBy.id,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok)
      setAssignmentError(data.error ?? "Unable to update assignment");
    else {
      const refreshed = await fetch(`/api/applications/${application.id}`);
      if (refreshed.ok) setApplication(await refreshed.json());
    }
    setSavingAssignment(false);
  }

  async function updateWorkItem(
    id: string,
    status: string,
    assignedToId?: string | null,
  ) {
    if (!application) return;
    const response = await fetch(`/api/work-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        assignedToId,
        performedById: currentUser?.id ?? application.createdBy.id,
      }),
    });
    if (!response.ok) return;
    const refreshed = await fetch(`/api/applications/${application.id}`);
    if (refreshed.ok) setApplication(await refreshed.json());
  }

  async function createWorkItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application || !workTitle.trim()) return;

    setCreatingWorkItem(true);
    setWorkItemError(null);

    try {
      const response = await fetch(
        `/api/applications/${application.id}/work-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: workTitle,
            description: workDescription,
            createdById: currentUser?.id ?? application.createdBy.id,
            assignedToId: application.assignedTo?.id,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create work item");
      }

      setApplication((current) =>
        current
          ? {
              ...current,
              workItems: [data, ...current.workItems],
              activities: [
                {
                  id: `work-item-${data.id}`,
                  type: "WORK_ITEM_CREATED",
                  description: `Work item created: ${data.title}`,
                  createdAt: new Date().toISOString(),
                  performedBy: { name: current.createdBy.name },
                },
                ...current.activities,
              ],
            }
          : current,
      );
      setWorkTitle("");
      setWorkDescription("");
    } catch (error) {
      setWorkItemError(
        error instanceof Error ? error.message : "Unable to create work item",
      );
    } finally {
      setCreatingWorkItem(false);
    }
  }

  if (loading) {
    return <main className="p-8 text-black">Loading application...</main>;
  }

  if (!application) {
    return <main className="p-8 text-black">Application not found.</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-black">
      <div className="mx-auto max-w-6xl">
        <a
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </a>

        <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {application.referenceNumber}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {application.title}
            </h1>

            <p className="mt-2 text-slate-600">{application.description}</p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {application.status.replaceAll("_", " ")}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Customer</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">Name:</strong>{" "}
                {application.customer.firstName} {application.customer.lastName}
              </p>

              <p>
                <strong className="text-slate-900">Email:</strong>{" "}
                {application.customer.email}
              </p>

              <p>
                <strong className="text-slate-900">Phone:</strong>{" "}
                {application.customer.phone ?? "Not provided"}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Assignment</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">Priority:</strong>{" "}
                {application.priority}
              </p>

              <p>
                <strong className="text-slate-900">Assigned to:</strong>{" "}
                {application.assignedTo?.name ?? "Unassigned"}
              </p>

              {currentUser?.role !== "EXECUTIVE" && (
                <select
                  value={application.assignedTo?.id ?? ""}
                  onChange={(event) =>
                    void updateAssignment(event.target.value)
                  }
                  disabled={savingAssignment}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter(
                      (user) =>
                        user.role === "MANAGER" || user.role === "EXECUTIVE",
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.role}
                      </option>
                    ))}
                </select>
              )}
              {assignmentError && (
                <p className="mt-2 text-sm text-red-600">{assignmentError}</p>
              )}

              {application.assignedTo && (
                <p>
                  <strong className="text-slate-900">Email:</strong>{" "}
                  {application.assignedTo.email}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Workflow</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "NEW",
                "WAITING_FOR_INFORMATION",
                "IN_PROGRESS",
                "UNDER_REVIEW",
                "COMPLETED",
              ].map((status) => (
                <span
                  key={status}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    status === application.status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {status.replaceAll("_", " ")}
                </span>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-sm font-medium text-slate-700">
                Change status
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(allowedTransitions[application.status] ?? []).map(
                  (nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      onClick={() => changeStatus(nextStatus)}
                      disabled={changingStatus !== null}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {changingStatus === nextStatus
                        ? "Updating..."
                        : nextStatus.replaceAll("_", " ")}
                    </button>
                  ),
                )}
              </div>

              {statusError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {statusError}
                </p>
              )}

              {allowedTransitions[application.status]?.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  This application is complete.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="font-semibold text-slate-900">
                External synchronization
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Completed applications are sent to the external system
                automatically.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                application.syncStatus === "SYNCED"
                  ? "bg-emerald-100 text-emerald-700"
                  : application.syncStatus === "FAILED"
                    ? "bg-red-100 text-red-700"
                    : application.syncStatus === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
              }`}
            >
              {application.syncStatus}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>Attempts: {application.syncAttempts}</p>
              {application.lastSyncError && (
                <p className="mt-1 text-red-600">
                  Last error: {application.lastSyncError}
                </p>
              )}
            </div>
            {application.syncStatus === "FAILED" && (
              <button
                type="button"
                onClick={retrySynchronization}
                disabled={retryingSync}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retryingSync ? "Retrying..." : "Retry synchronization"}
              </button>
            )}
          </div>
          {syncError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {syncError}
            </p>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Work items</h2>

            <form
              onSubmit={createWorkItem}
              className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4"
            >
              <label
                htmlFor="work-item-title"
                className="text-sm font-medium text-slate-700"
              >
                Add work item
              </label>
              <input
                id="work-item-title"
                value={workTitle}
                onChange={(event) => setWorkTitle(event.target.value)}
                placeholder="e.g. Verify submitted documents"
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-black outline-none ring-blue-500 focus:ring-2"
                required
              />
              <textarea
                value={workDescription}
                onChange={(event) => setWorkDescription(event.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white text-black px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Assigned to: {application.assignedTo?.name ?? "Unassigned"}
                </p>
                <button
                  type="submit"
                  disabled={creatingWorkItem || !workTitle.trim()}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingWorkItem ? "Adding..." : "Add work item"}
                </button>
              </div>
              {workItemError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {workItemError}
                </p>
              )}
            </form>

            <div className="mt-4 space-y-3">
              {(application.workItems ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  No work items have been added.
                </p>
              ) : (
                (application.workItems ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description ?? "No description"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-blue-600">
                      {item.status.replaceAll("_", " ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["TODO", "IN_PROGRESS", "COMPLETED"] as const).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              void updateWorkItem(
                                item.id,
                                status,
                                item.assignedTo?.id,
                              )
                            }
                            disabled={item.status === status}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {status === "COMPLETED"
                              ? "Mark completed"
                              : status.replaceAll("_", " ")}
                          </button>
                        ),
                      )}
                      {currentUser?.role !== "EXECUTIVE" && (
                        <select
                          value={item.assignedTo?.id ?? ""}
                          onChange={(event) =>
                            void updateWorkItem(
                              item.id,
                              item.status,
                              event.target.value || null,
                            )
                          }
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-black"
                        >
                          <option value="">Unassigned</option>
                          {users
                            .filter(
                              (user) =>
                                user.role === "MANAGER" ||
                                user.role === "EXECUTIVE",
                            )
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Activity history</h2>

            <div className="mt-4 space-y-4">
              {application.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-2 border-blue-200 pl-4"
                >
                  <p className="text-sm text-slate-900">
                    {activity.description}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {activity.performedBy.name} ·{" "}
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
