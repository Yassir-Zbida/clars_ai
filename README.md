# Clars.ai

**Intelligent CRM for freelancers & solopreneurs.**  
Manage contacts, projects, invoices, expenses, and analytics — all in one clean workspace, with an AI assistant built in.

---

## Features

| Area | Capabilities |
|---|---|
| **Contacts** | CRM list, pipeline view, segments, health scoring, follow-up reminders |
| **Projects** | Kanban tasks, events, notes, timeline, budget tracking, contact linking |
| **Finance** | Invoices, quotes, payments, expenses with full status lifecycle |
| **Analytics** | Revenue trends, client analysis, productivity, forecasting |
| **AI Assistant** | Chat copilot, email generator, reports generator (OpenAI / OpenRouter / Gemini) |
| **Authentication** | Email + password, optional email OTP two-factor login |
| **Emails** | Password reset & OTP verification via Resend |
| **Settings** | Profile, business details, signature, logo, currency, OTP toggle |
| **Onboarding** | Multi-step survey wizard with role & goal personalisation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Database | [MongoDB](https://mongodb.com) via [Mongoose](https://mongoosejs.com) |
| Auth | [NextAuth.js v5](https://authjs.dev) — JWT sessions, Credentials + Resend providers |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Charts | [Recharts](https://recharts.org) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| Tables | [TanStack Table v8](https://tanstack.com/table) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Validation | [Zod](https://zod.dev) |
| Email | [Resend](https://resend.com) |
| Icons | [Remix Icons](https://remixicon.com) + [Lucide](https://lucide.dev) |
| Toasts | [Sonner](https://sonner.emilkowal.ski) |

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — local instance or [MongoDB Atlas](https://cloud.mongodb.com) free tier
- **Resend** account for transactional emails (password reset, OTP)
- An AI key for the assistant feature (OpenAI, OpenRouter, or Gemini — one is enough)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Yassir-Zbida/clars_ai.git
cd clars_ai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum set MONGODB_URI and AUTH_SECRET

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up for a new account.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# ── Required ────────────────────────────────────────────────────────────────

# MongoDB connection string
MONGODB_URI="mongodb://localhost:27017/clars_ai"

# NextAuth secret — generate with: npx auth secret
AUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# ── Email (required for password reset & OTP) ───────────────────────────────

# Sign up at https://resend.com — free tier supports 3 000 emails/month
RESEND_API_KEY=""
# Verify your domain in Resend and set your sender address.
# During development you can use: onboarding@resend.dev (delivers to your Resend account email only)
EMAIL_FROM="onboarding@resend.dev"

# ── Optional ────────────────────────────────────────────────────────────────

# Public URL used in email links (defaults to NEXTAUTH_URL)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Assistant — set at least one key to enable /dashboard/ai
# Priority: OpenRouter → OpenAI → Gemini
OPENROUTER_API_KEY=""
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

---

## Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run dev:clean    # Clear .next cache then start dev
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format src/**
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup, forgot-password, reset-password, OTP
│   ├── api/                 # REST API routes
│   │   ├── auth/            # NextAuth + password reset + signup
│   │   ├── ai/              # AI chat endpoint
│   │   ├── clients/         # Contacts CRUD
│   │   ├── projects/        # Projects + tasks CRUD
│   │   ├── invoices/        # Invoices & quotes
│   │   ├── payments/        # Payments
│   │   ├── expenses/        # Expenses
│   │   └── user/            # Profile, settings, OTP toggle, survey
│   └── dashboard/           # All dashboard pages
│       ├── (home)/          # Overview, insights, activity
│       ├── analytics/       # Revenue, clients, productivity, forecast
│       ├── clients/         # Contacts list, pipeline, segments, import
│       ├── projects/        # Projects list + detail (tasks, events, notes)
│       ├── finance/         # Finance overview
│       ├── invoices/        # Invoices & quotes
│       ├── ai/              # Chat, email generator, reports
│       ├── settings/        # Profile, security, OTP
│       ├── billing/         # Plan & revenue
│       └── help/            # Shortcuts & support
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── nav/                 # Sidebar navigation components
│   └── dashboard/           # Dashboard-specific components
├── lib/                     # Utilities, email templates, money formatting
├── server/
│   ├── db.ts                # Mongoose connection
│   └── models/              # Mongoose schemas (User, Client, Project, Invoice…)
├── contexts/                # Currency context
├── stores/                  # Zustand stores
└── auth.ts                  # NextAuth configuration
```

---

## Key Workflows

### Authentication
- **Sign up** → onboarding survey → dashboard
- **Sign in** (password) → dashboard, or OTP page if 2FA is enabled
- **OTP 2FA** — enable in Settings → Security; a 6-digit code is emailed on every login
- **Password reset** — forgot-password flow with email link (1-hour expiry)

### AI Assistant
Set at least one of `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`.  
The assistant reads live CRM data (contacts, projects, invoices) and can create records directly from chat.

### Email Delivery (Production)
1. Add and verify your domain in the [Resend dashboard](https://resend.com/domains)
2. Set `EMAIL_FROM="noreply@yourdomain.com"` in your production environment
3. No code changes required

---

## Contributing

- Code style and architecture conventions are in `cursorrules`
- All API routes are in `src/app/api/` and follow REST conventions
- Zod is used for all request body validation
- New UI components should use the `SectionCard` / `SectionHeader` primitives from `src/app/dashboard/analytics/_components/analytics-page-shell.tsx`

---

## License

Private — all rights reserved.
