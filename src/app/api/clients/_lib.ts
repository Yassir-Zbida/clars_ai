import { z } from 'zod';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const clientTypeValues = ['INDIVIDUAL', 'COMPANY'] as const;
export const clientStatusValues = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const clientSourceValues = ['REFERRAL', 'LINKEDIN', 'UPWORK', 'WEBSITE', 'COLD_OUTREACH', 'SOCIAL', 'OTHER'] as const;
export const clientLangValues = ['FR', 'EN', 'AR'] as const;
export const healthLabelValues = ['STRONG', 'NEUTRAL', 'AT_RISK'] as const;
export const interactionTypeValues = ['EMAIL', 'CALL', 'MEETING', 'NOTE', 'PROPOSAL', 'INVOICE', 'PAYMENT', 'MILESTONE'] as const;

export const CreateClientSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  birthday: z.string().optional(),
  type: z.enum(clientTypeValues).default('INDIVIDUAL'),
  status: z.enum(clientStatusValues).default('LEAD'),
  source: z.enum(clientSourceValues).optional(),
  industry: z.string().optional(),
  language: z.enum(clientLangValues).default('FR'),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().default('EUR'),
  defaultRate: z.number().positive().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isFavorite: z.boolean().default(false),
  firstContactAt: z.string().datetime().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial()
  .omit({ nextFollowUpAt: true })
  .extend({
    isArchived: z.boolean().optional(),
    healthScore: z.number().min(0).max(100).optional(),
    healthLabel: z.enum(healthLabelValues).optional(),
    /** Pass `null` to clear a scheduled follow-up */
    nextFollowUpAt: z.union([z.string().datetime(), z.null()]).optional(),
  });

export const CreateContactSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const CreateInteractionSchema = z.object({
  type: z.enum(interactionTypeValues),
  title: z.string().min(1).max(200),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const ClientListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(clientStatusValues)).default([]),
  healthLabel: z.array(z.enum(healthLabelValues)).default([]),
  source: z.array(z.enum(clientSourceValues)).default([]),
  tags: z.array(z.string()).default([]),
  type: z.enum(clientTypeValues).optional(),
  currency: z.string().optional(),
  minRevenue: z.number().optional(),
  maxRevenue: z.number().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().default(false),
  sortBy: z.enum(['createdAt', 'lastContactAt', 'totalRevenue', 'healthScore', 'fullName']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  /** Pickers and imports may request larger pages; keep a sane upper bound. */
  limit: z.number().int().min(1).max(500).default(20),
});

export function cleanOptionalString(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function pickAll(searchParams: URLSearchParams, key: string): string[] {
  const direct = searchParams.getAll(key);
  const csv = (searchParams.get(key) ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set([...direct, ...csv]));
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value == null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseClientListQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  return ClientListQuerySchema.parse({
    search: searchParams.get('search') ?? undefined,
    status: pickAll(searchParams, 'status'),
    healthLabel: pickAll(searchParams, 'healthLabel'),
    source: pickAll(searchParams, 'source'),
    tags: pickAll(searchParams, 'tags'),
    type: searchParams.get('type') ?? undefined,
    currency: searchParams.get('currency') ?? undefined,
    minRevenue: parseNumber(searchParams.get('minRevenue')),
    maxRevenue: parseNumber(searchParams.get('maxRevenue')),
    isFavorite: parseBoolean(searchParams.get('isFavorite')),
    isArchived: parseBoolean(searchParams.get('isArchived')) ?? false,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortDir: searchParams.get('sortDir') ?? undefined,
    page: parseNumber(searchParams.get('page')) ?? 1,
    limit: parseNumber(searchParams.get('limit')) ?? 20,
  });
}

export function asObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { userId };
}

export function zodErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', issues: error.flatten() },
      { status: 400 }
    );
  }
  return null;
}
