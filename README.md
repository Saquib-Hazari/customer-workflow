# Customer Workflow Management System

A Next.js 16 + TypeScript application for customers, applications, assignments, work items, workflow transitions, activity history, and mock external synchronization.

## Setup

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000.

Environment variables:

- `DATABASE_URL`: SQLite connection string, normally `file:./dev.db`.
- `MOCK_SYNC_FAILURE=true`: forces mock synchronization to fail for retry testing.

Verification commands:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
```

## What the application does

The system supports customer creation/search, linked applications, application search/filtering, assignment and reassignment, controlled workflow status changes, operational work items, activity history, and mock synchronization with failure/retry handling.

The browser calls Next.js route handlers with `fetch`. Handlers validate input, load the current user from the HTTP-only `demo_user_id` cookie, enforce permissions, write through Prisma, and return JSON. SQLite is used for local assessment development.

## Demo authentication

There is no public signup and no password flow. `/login` shows ADMIN and MANAGER cards. Any existing user—including an EXECUTIVE or a user added by an administrator/manager—can also sign in by entering their exact name or email.

The server validates the identifier against Prisma and stores the user ID in an HTTP-only `demo_user_id` cookie. The cookie uses `SameSite=Lax`, `path=/`, and `secure` in production. Logout expires it. Protected pages redirect to `/login`; protected APIs return `401` when unauthenticated and `403` when authenticated but unauthorized.

This is assessment-level authentication, not production authentication. Production should use passwords or an identity provider, signed/server-backed sessions, expiry/rotation/revocation, CSRF protection, rate limiting, and stronger session management.

## Roles and permissions

### ADMIN

Full access to customers, applications, assignments, workflow actions, work items, synchronization, and users. ADMIN can create or manage ADMIN, MANAGER, and EXECUTIVE users.

### MANAGER

Can create applications, view/manage applications and work items for their team, assign/reassign applications, assign work items, change workflow status, retry synchronization, and manage EXECUTIVE users on their own team. MANAGER cannot manage ADMIN or MANAGER users or users from another team.

### EXECUTIVE

Works on applications assigned to them. Can view assigned applications, change permitted workflow statuses, create work items for assigned applications, update/complete their own assigned work items, and view activity history. EXECUTIVE cannot create applications, access `/users`, assign/reassign applications, or reassign work items. Unassigned and unrelated applications return `403`.

The UI hides unavailable actions, but APIs enforce the same rules. Activities always use the authenticated cookie user; client-provided `performedById` and `createdById` values are not trusted.

## Routes and APIs

UI: `/`, `/login`, `/dashboard`, `/customers`, `/applications`, `/applications/new`, `/applications/[id]`, and `/users`.

APIs: `GET/POST /api/customers`, `GET/POST /api/applications`, `GET /api/applications/[id]`, `PATCH /api/applications/[id]/assignment`, `PATCH /api/applications/[id]/status`, `POST /api/applications/[id]/work-items`, `POST /api/applications/[id]/sync`, `GET/PATCH /api/work-items/[id]`, `GET/POST /api/users`, `PATCH/DELETE /api/users/[id]`, and the `/api/auth/*` routes.

## Workflow

```text
NEW -> WAITING_FOR_INFORMATION or IN_PROGRESS
WAITING_FOR_INFORMATION -> IN_PROGRESS
IN_PROGRESS -> WAITING_FOR_INFORMATION or UNDER_REVIEW
UNDER_REVIEW -> IN_PROGRESS or COMPLETED
COMPLETED -> terminal; cannot be reopened
```

Invalid transitions return `400` without changing the database. Valid transitions create activity records.

## Work items and activity history

Work items belong to an application and use `TODO`, `IN_PROGRESS`, or `COMPLETED`. ADMIN/MANAGER users can assign or reassign them. An EXECUTIVE creating a work item on an application assigned to them gets it assigned to themselves and can update/complete it. Creation, assignment/status changes, and completion are recorded in activity history with the authenticated actor and timestamp.

## External synchronization

Completion is persisted first. Mock synchronization then stores `PENDING`, `SYNCED`, or `FAILED`, along with `syncAttempts` and `lastSyncError`. Failure never rolls back completion. Retry uses `POST /api/applications/[id]/sync` or the detail-page button.

Test failure with `MOCK_SYNC_FAILURE=true npm run dev`, complete an application, restart without the flag, and retry. Requests while `PENDING` are rejected to reduce duplicates. Production should add idempotency keys, durable queues, locking, timeouts, backoff, and dead-letter handling.

## Data model

Teams contain Users. Customers have Applications. Applications reference a customer, creator, optional assignee, WorkItems, Activities, workflow status, priority, and synchronization metadata. WorkItems reference an application, creator, and optional assignee. Activities identify the application, event type, actor, description, and timestamp.

## Assumptions, limitations, and trade-offs

- Seeded users are demo identities, not verified accounts; there is no public signup.
- Login uses exact name/email matching and has no passwords.
- SQLite and synchronous mock synchronization keep the assessment reproducible.
- User deletion can be blocked while foreign-key records reference that user.
- Search is basic, pagination is not implemented, and concurrent edits are last-write-wins.
- Automated tests cover validation, permissions, workflow, and synchronization logic; full HTTP/browser integration coverage remains future work.

## Production improvements

Add an identity provider/password auth, secure expiring sessions, CSRF protection, rate limiting, immutable audit logging, correlation IDs, integration tests, optimistic locking, background synchronization workers, idempotency, managed database backups, pagination, and observability.

## AI and tools

Implementation and review used Codex, local Next.js/Prisma documentation, Prisma CLI, TypeScript, Biome, and the Node test runner. Existing schema and working features were preserved.
