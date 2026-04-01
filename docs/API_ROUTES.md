# HTTP API surface (App Router)

High-level map of `src/app/api/**/route.ts` handlers. All routes are under `/api/…`. Most user data routes require a session cookie (see each handler).

| Area | Routes |
|------|--------|
| Auth | `auth/[...nextauth]`, `auth/signup`, `auth/forgot-password`, `auth/reset-password` |
| User | `user/me`, `user/send-otp`, `user/verify-otp`, `user/otp-toggle`, `user/onboarding-survey` |
| Clients | `clients`, `clients/[id]`, `clients/[id]/contacts`, `clients/[id]/contacts/[cid]`, `clients/[id]/health`, `clients/[id]/interactions`, `clients/[id]/stats`, `clients/export`, `clients/import` |
| Projects | `projects`, `projects/[id]`, `projects/[id]/tasks`, `projects/[id]/tasks/[taskId]`, `projects/[id]/notes`, `projects/[id]/notes/[noteId]`, `projects/[id]/events`, `projects/[id]/events/[eventId]` |
| Finance | `invoices`, `invoices/[id]`, `invoices/[id]/payments`, `payments`, `expenses`, `expenses/[id]`, `finance/summary` |
| Dashboard | `dashboard/activity`, `dashboard/insights`, `analytics/overview` |
| AI | `ai/chat`, `ai/email`, `ai/reports`, `ai/page-view` |
| Admin | `admin/dashboard`, `admin/logs`, `admin/users`, `admin/users/[id]`, `admin/status`, `admin/surveys`, `admin/ai-analytics`, `admin/reports`, `admin/reports/[id]`, `admin/reports/[id]/run` |
| Other | `trpc/[trpc]`, `client-logs`, `dev/seed-demo` |

Regenerate or extend this list when adding routes. For OpenAPI-style specs, consider generating from Zod schemas where applicable.
