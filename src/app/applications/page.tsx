"use client";

import { useEffect, useState } from "react";
import { permissionMessage, readApiResponse } from "@/lib/api-client";

type Application = {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  priority: string;
  customer: { firstName: string; lastName: string };
  assignedTo: { name: string } | null;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams({ search, status, priority });
    setLoading(true);
    fetch(`/api/applications?${query}`)
      .then(async (response) => {
        const result = await readApiResponse<Application[]>(response);
        if (!result.ok) {
          if (result.status === 401) window.location.href = "/login";
          setError(
            permissionMessage(result.status, "Unable to load applications."),
          );
          setApplications([]);
          return;
        }
        setError(null);
        setApplications(Array.isArray(result.data) ? result.data : []);
      })
      .catch(() => {
        setError("Unable to reach the server. Please retry.");
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, [search, status, priority]);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <a
              href="/dashboard"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Dashboard
            </a>
            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Applications
            </h1>
            <p className="mt-2 text-slate-600">
              Search and filter the application queue.
            </p>
          </div>
          <a
            href="/applications/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New application
          </a>
        </div>
        <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reference, title, or customer"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-500"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
          >
            <option value="">All statuses</option>
            {[
              "NEW",
              "WAITING_FOR_INFORMATION",
              "IN_PROGRESS",
              "UNDER_REVIEW",
              "COMPLETED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
          >
            <option value="">All priorities</option>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {loading && (
            <p className="p-5 text-sm text-slate-600">Loading applications…</p>
          )}
          {error && (
            <div className="flex items-center justify-between p-5 text-sm text-red-600">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded border border-blue-300 px-3 py-1 text-blue-700"
              >
                Retry
              </button>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <a
                      href={`/applications/${application.id}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {application.referenceNumber}
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    {application.customer.firstName}{" "}
                    {application.customer.lastName}
                  </td>
                  <td className="px-5 py-4">{application.title}</td>
                  <td className="px-5 py-4">
                    {application.status.replaceAll("_", " ")}
                  </td>
                  <td className="px-5 py-4">{application.priority}</td>
                  <td className="px-5 py-4">
                    {application.assignedTo?.name ?? "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
