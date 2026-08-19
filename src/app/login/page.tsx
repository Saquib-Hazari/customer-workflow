"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: { name: string } | null;
};

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) =>
        setUsers(
          Array.isArray(data)
            ? data.filter(
                (user: User) =>
                  user.role === "ADMIN" || user.role === "MANAGER",
              )
            : [],
        ),
      )
      .catch(() => setUsers([]));
  }, []);

  async function login() {
    setError(null);
    setSubmitting(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        username.trim() ? { username: username.trim() } : { userId: selected },
      ),
    });
    if (!response.ok) {
      setError("Unable to start demo session");
      setSubmitting(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-black">
      <div className="mx-auto max-w-xl">
        <a
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Home
        </a>
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Assessment demo access
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Choose a demo user
          </h1>
          <p className="mt-3 text-slate-600">
            There is no public signup or password flow in this assessment build.
          </p>
          <div className="mt-6 space-y-3">
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setSelected("");
              }}
              placeholder="Enter your name or email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Or choose an administrator or manager:
            </p>
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setSelected(user.id);
                  setUsername("");
                }}
                className={`w-full rounded-lg border p-4 text-left text-black ${selected === user.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}
              >
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {user.role} · {user.team?.name ?? "No team"}
                </p>
                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
              </button>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={(!selected && !username.trim()) || submitting}
            onClick={() => void login()}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
