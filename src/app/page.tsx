"use client";

import { useEffect, useState } from "react";

const destinations = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Monitor the application queue and current workload.",
  },
  {
    href: "/customers",
    label: "Customers",
    description: "Create, search, and review customer applications.",
  },
  {
    href: "/applications",
    label: "Applications",
    description: "Search applications, filter status, and open details.",
  },
  {
    href: "/applications/new",
    label: "New application",
    description: "Start a new customer application and assign ownership.",
  },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setCurrentUser(data?.user ?? null))
      .catch(() => setCurrentUser(null));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-black sm:px-10">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between border-b border-slate-200 pb-6">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Y-Axis Operations
          </a>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  aria-expanded={menuOpen}
                >
                  {currentUser.role}
                  <span className="ml-2 text-xs text-slate-400">▾</span>
                </button>
                <div
                  className={`absolute right-0 z-10 mt-2 w-44 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg transition-all duration-200 ${menuOpen ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"}`}
                >
                  <a
                    href="/dashboard"
                    className="block rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/login";
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <a
                href="/login"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Demo login
              </a>
            )}
            {!currentUser && (
              <a
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open dashboard
              </a>
            )}
          </div>
        </nav>

        <section className="grid gap-12 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              Customer workflow management
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Keep every application moving with clarity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              One workspace for customer records, application ownership,
              operational work items, controlled status changes, and activity
              history.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Workflow at a glance
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {["NEW", "IN PROGRESS", "UNDER REVIEW", "COMPLETED"].map(
                (stage, index) => (
                  <span key={stage} className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">
                      {stage}
                    </span>
                    {index < 3 && <span className="text-slate-400">→</span>}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {destinations.map((destination) => (
            <a
              key={destination.href}
              href={destination.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {destination.label}
                </h2>
                <span className="text-xl text-blue-300 transition group-hover:translate-x-1">
                  →
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {destination.description}
              </p>
            </a>
          ))}
        </section>

        <footer className="border-t border-slate-200 py-6 text-sm text-slate-500">
          Demo environment · Seeded users represent administrator, manager, and
          executive roles.
        </footer>
      </div>
    </main>
  );
}
