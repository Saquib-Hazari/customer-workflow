"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { permissionMessage, readApiResponse } from "@/lib/api-client";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  applications: {
    id: string;
    referenceNumber: string;
    title: string;
    status: string;
  }[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(
    async (value = search) => {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(value)}`,
      );
      const result = await readApiResponse<Customer[]>(response);
      if (result.ok) {
        setCustomers(Array.isArray(result.data) ? result.data : []);
        setMessage(null);
      } else {
        if (result.status === 401) window.location.href = "/login";
        setCustomers([]);
        setMessage(
          permissionMessage(
            result.status,
            "Unable to load customers. Please retry.",
          ),
        );
      }
      setLoading(false);
    },
    [search],
  );

  useEffect(() => {
    void loadCustomers("");
  }, [loadCustomers]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await readApiResponse<Customer>(response);
    if (!result.ok) {
      if (result.status === 401) window.location.href = "/login";
      setMessage(
        permissionMessage(
          result.status,
          result.error || "Unable to create customer",
        ),
      );
      return;
    }
    setForm({ firstName: "", lastName: "", email: "", phone: "" });
    setMessage("Customer created");
    await loadCustomers();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Dashboard
        </a>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            <p className="mt-2 text-slate-600">
              Manage customer records and linked applications.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              void loadCustomers(event.target.value);
            }}
            placeholder="Search customers"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-500"
          />
        </div>
        <form
          onSubmit={createCustomer}
          className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-5"
        >
          {(["firstName", "lastName", "email", "phone"] as const).map(
            (field) => (
              <input
                key={field}
                required={field !== "phone"}
                value={form[field]}
                onChange={(event) =>
                  setForm({ ...form, [field]: event.target.value })
                }
                placeholder={
                  field === "firstName"
                    ? "First name"
                    : field === "lastName"
                      ? "Last name"
                      : field[0].toUpperCase() + field.slice(1)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-500"
              />
            ),
          )}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add customer
          </button>
          {message && (
            <p className="md:col-span-5 text-sm text-slate-600">{message}</p>
          )}
        </form>
        {loading && (
          <p className="mt-6 text-sm text-slate-600">Loading customers…</p>
        )}
        <div className="mt-6 space-y-3">
          {customers.map((customer) => (
            <article
              key={customer.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {customer.applications.length} application
                  {customer.applications.length === 1 ? "" : "s"}
                </span>
              </div>
              {customer.applications.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {customer.applications.map((application) => (
                    <a
                      key={application.id}
                      href={`/applications/${application.id}`}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {application.referenceNumber} · {application.status}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
          {message && customers.length === 0 && !loading && (
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="rounded border border-blue-300 px-3 py-2 text-sm text-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
