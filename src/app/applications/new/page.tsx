"use client";

import { type FormEvent, useEffect, useState } from "react";
import { permissionMessage, readApiResponse } from "@/lib/api-client";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
type User = { id: string; name: string; role: string };

export default function NewApplicationPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    referenceNumber: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    customerId: "",
    assignedToId: "",
    createdById: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [customerResponse, userResponse] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/users"),
        ]);
        const meResponse = await fetch("/api/auth/me");
        const meData = meResponse.ok ? await meResponse.json() : null;
        if (meData?.user?.role === "EXECUTIVE") {
          setError("You do not have permission to create an application.");
          return;
        }
        const customersResult =
          await readApiResponse<Customer[]>(customerResponse);
        const usersResult = await readApiResponse<User[]>(userResponse);
        if (!customersResult.ok) {
          if (customersResult.status === 401) window.location.href = "/login";
          setError(
            customersResult.status === 403
              ? "You do not have permission to create an application."
              : permissionMessage(
                  customersResult.status,
                  "Unable to load customers. Please retry.",
                ),
          );
          return;
        }
        if (!usersResult.ok) {
          if (usersResult.status === 401) window.location.href = "/login";
          setError(
            permissionMessage(
              usersResult.status,
              "Unable to load users. Please retry.",
            ),
          );
          return;
        }
        const loadedCustomers = Array.isArray(customersResult.data)
          ? customersResult.data
          : [];
        const loadedUsers = Array.isArray(usersResult.data)
          ? usersResult.data
          : [];
        setCustomers(loadedCustomers);
        setUsers(loadedUsers);
        const manager = loadedUsers.find((user) => user.role === "MANAGER");
        setForm((current) => ({
          ...current,
          customerId: loadedCustomers[0]?.id ?? "",
          createdById: manager?.id ?? loadedUsers[0]?.id ?? "",
        }));
      } catch {
        setError("Unable to load application data. Please retry.");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await readApiResponse<{ id: string }>(response);
    if (!result.ok || !result.data) {
      if (result.status === 401) window.location.href = "/login";
      setError(
        permissionMessage(
          result.status,
          result.error || "Unable to create application",
        ),
      );
      return;
    }
    window.location.href = `/applications/${result.data.id}`;
  }

  if (
    !loading &&
    error === "You do not have permission to create an application."
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-black">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
          <p className="mt-3 text-red-600">{error}</p>
          <a
            href="/dashboard"
            className="mt-5 inline-block rounded bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            Back to dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-black">
      <div className="mx-auto max-w-3xl">
        <a
          href="/applications"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Applications
        </a>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          New application
        </h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {loading && (
          <p className="mt-4 text-sm text-slate-600">
            Loading customers and users…
          </p>
        )}
        {!loading && error && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700"
          >
            Retry
          </button>
        )}
        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <input
            required
            placeholder="Reference number"
            value={form.referenceNumber}
            onChange={(e) =>
              setForm({ ...form, referenceNumber: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500"
          />
          <select
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black"
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName} · {customer.email}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500"
          />
          <textarea
            required
            placeholder="Description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-black"
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-black"
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
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || customers.length === 0 || users.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Create application
          </button>
        </form>
      </div>
    </main>
  );
}
