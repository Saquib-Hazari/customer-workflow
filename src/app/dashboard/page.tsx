"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  priority: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  assignedTo: {
    name: string;
  } | null;
};

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [users, setUsers] = useState<
    {
      id: string;
      name: string;
      email: string;
      role: string;
      teamId: string | null;
    }[]
  >([]);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "EXECUTIVE",
  });
  const [userMessage, setUserMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadApplications() {
      const response = await fetch("/api/applications");
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(data?.error ?? "Unable to load applications");
        setApplications([]);
      } else {
        setApplications(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }

    loadApplications();
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        setCurrentUser(data.user);
        if (data.user)
          fetch("/api/users")
            .then((response) => (response.ok ? response.json() : []))
            .then((data) => setUsers(Array.isArray(data) ? data : []));
      });
  }, []);

  async function addUser() {
    setUserMessage(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUserMessage(data.error ?? "Unable to add user");
      return;
    }
    setUsers((current) => [...current, data]);
    setUserForm({
      name: "",
      email: "",
      role: currentUser?.role === "ADMIN" ? "EXECUTIVE" : "EXECUTIVE",
    });
    setUserMessage("User added");
  }

  async function removeUser(id: string) {
    setUserMessage(null);
    const response = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUserMessage(data.error ?? "Unable to remove user");
      return;
    }
    setUsers((current) => current.filter((user) => user.id !== id));
    setUserMessage("User removed");
  }

  if (loading) {
    return <main className="p-8">Loading applications...</main>;
  }

  if (error) {
    return <main className="p-8 text-red-600">{error}</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <a
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Home
          </a>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Operations
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Application dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Monitor customer applications and assigned work.
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
            {currentUser && (
              <span>
                Signed in as{" "}
                <strong className="text-slate-900">{currentUser.name}</strong> ·{" "}
                {currentUser.role}
              </span>
            )}
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="rounded-md border border-red-300 px-3 py-1 font-medium text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
          {currentUser &&
            (currentUser.role === "ADMIN" ||
              currentUser.role === "MANAGER") && (
              <nav className="mt-5 flex flex-wrap gap-2 text-sm">
                <a
                  href="/dashboard"
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
                >
                  Dashboard
                </a>
                <a
                  href="/customers"
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
                >
                  Customers
                </a>
                <a
                  href="/applications"
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
                >
                  Applications
                </a>
                <a
                  href="/users"
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
                >
                  Users
                </a>
                <a
                  href="/applications/new"
                  className="rounded bg-blue-600 px-3 py-2 font-semibold text-white"
                >
                  New Application
                </a>
              </nav>
            )}
          {currentUser?.role === "EXECUTIVE" && (
            <nav className="mt-5 flex flex-wrap gap-2 text-sm">
              <a
                href="/dashboard"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
              >
                Dashboard
              </a>
              <a
                href="/applications"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
              >
                Assigned Applications
              </a>
              <a
                href="/applications"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
              >
                My Work Items
              </a>
            </nav>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Total applications" value={applications.length} />

          <MetricCard
            label="In progress"
            value={
              applications.filter(
                (application) => application.status === "IN_PROGRESS",
              ).length
            }
          />

          <MetricCard
            label="Waiting for information"
            value={
              applications.filter(
                (application) =>
                  application.status === "WAITING_FOR_INFORMATION",
              ).length
            }
          />

          <MetricCard
            label="Completed"
            value={
              applications.filter(
                (application) => application.status === "COMPLETED",
              ).length
            }
          />
        </div>

        {currentUser &&
          (currentUser.role === "ADMIN" || currentUser.role === "MANAGER") && (
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">User management</h2>
              <p className="mt-1 text-sm text-slate-600">
                {currentUser.role === "ADMIN"
                  ? "Add or remove administrators, managers, and executives."
                  : "Add or remove executives on your team."}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <input
                  value={userForm.name}
                  onChange={(event) =>
                    setUserForm({ ...userForm, name: event.target.value })
                  }
                  placeholder="Name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
                />
                <input
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm({ ...userForm, email: event.target.value })
                  }
                  placeholder="Email"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
                />
                {currentUser.role === "ADMIN" ? (
                  <select
                    value={userForm.role}
                    onChange={(event) =>
                      setUserForm({ ...userForm, role: event.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
                  >
                    <option>EXECUTIVE</option>
                    <option>MANAGER</option>
                    <option>ADMIN</option>
                  </select>
                ) : (
                  <input
                    value="EXECUTIVE"
                    readOnly
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-black"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void addUser()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add user
                </button>
              </div>
              {userMessage && (
                <p className="mt-3 text-sm text-slate-600">{userMessage}</p>
              )}
              <div className="mt-4 space-y-2">
                {users
                  .filter(
                    (user) =>
                      currentUser.role === "ADMIN" || user.role === "EXECUTIVE",
                  )
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-black"
                    >
                      <span>
                        {user.name} · {user.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeUser(user.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Recent applications
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Application</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Assigned to</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-blue-700">
                      <a
                        href={`/applications/${application.id}`}
                        className="hover:underline"
                      >
                        {application.referenceNumber}
                      </a>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {application.customer.firstName}{" "}
                      {application.customer.lastName}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {application.title}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={application.status} />
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {application.priority}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {application.assignedTo?.name ?? "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      {label}
    </span>
  );
}
