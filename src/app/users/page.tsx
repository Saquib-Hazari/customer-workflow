"use client";

import { useCallback, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentRole, setCurrentRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "EXECUTIVE" });

  const load = useCallback(async function load() {
    const me = await fetch("/api/auth/me");
    if (!me.ok) {
      window.location.href = "/login";
      return;
    }
    const meData = await me.json();
    setCurrentRole(meData.user?.role ?? "");
    if (meData.user?.role === "EXECUTIVE") {
      setError("You do not have permission to manage users.");
      return;
    }
    const response = await fetch("/api/users");
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      setError(data.error ?? "Unable to load users.");
      return;
    }
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addUser() {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Unable to add user.");
      return;
    }
    setUsers((items) => [...items, data]);
    setForm({ name: "", email: "", role: "EXECUTIVE" });
  }

  async function removeUser(id: string) {
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Unable to remove user.");
      return;
    }
    setUsers((items) => items.filter((user) => user.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-black">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </a>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">Users</h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {(currentRole === "ADMIN" || currentRole === "MANAGER") && (
          <>
            <div className="mt-6 grid gap-3 rounded-xl bg-white p-5 md:grid-cols-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="rounded border px-3 py-2 text-black"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="rounded border px-3 py-2 text-black"
              />
              {currentRole === "ADMIN" ? (
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="rounded border px-3 py-2 text-black"
                >
                  <option>EXECUTIVE</option>
                  <option>MANAGER</option>
                  <option>ADMIN</option>
                </select>
              ) : (
                <div className="rounded border bg-slate-50 px-3 py-2 text-black">
                  EXECUTIVE
                </div>
              )}
              <button
                type="button"
                onClick={() => void addUser()}
                className="rounded bg-blue-600 px-3 py-2 font-semibold text-white"
              >
                Add user
              </button>
            </div>
            <div className="mt-5 space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between rounded bg-white p-4 text-black"
                >
                  <span>
                    {user.name} · {user.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeUser(user.id)}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
