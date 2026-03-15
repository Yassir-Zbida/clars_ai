# clars.ai

CRM Intelligent pour Freelancers & Solopreneurs. Stack: Next.js 14 · Prisma · Gemini · Whop.

## Setup

1. Copy `.env.example` to `.env.local` and fill in values (at least `DATABASE_URL` and `NEXTAUTH_SECRET` for full features).
2. `npm install`
3. `npm run dev`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:generate` — generate Prisma client (after schema changes)
- `npm run db:push` — push schema to database
- `npm run db:studio` — open Prisma Studio

## Conventions

See `cursorrules` for code style, architecture, and feature rules.
