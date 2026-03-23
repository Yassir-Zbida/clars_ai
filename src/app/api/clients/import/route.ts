import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { CreateClientSchema, cleanOptionalString, requireUserId, zodErrorResponse } from '../_lib';

const ImportPayloadSchema = z.object({
  rows: z.array(
    z.object({
      fullName: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      language: z.string().optional(),
      currency: z.string().optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const input = ImportPayloadSchema.parse(await request.json());
    let imported = 0;
    let skipped = 0;
    const errors: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < input.rows.length; i += 1) {
      const row = input.rows[i];
      try {
        const tags = Array.isArray(row.tags)
          ? row.tags
          : typeof row.tags === 'string'
            ? row.tags.split('|').map((tag) => tag.trim()).filter(Boolean)
            : [];

        const parsed = CreateClientSchema.parse({
          fullName: row.fullName,
          email: row.email ?? '',
          phone: row.phone,
          company: row.company,
          status: row.status,
          source: row.source,
          language: row.language,
          currency: row.currency ?? 'EUR',
          tags,
        });

        await Client.create({
          userId: new mongoose.Types.ObjectId(authRes.userId),
          fullName: parsed.fullName.trim(),
          email: cleanOptionalString(parsed.email),
          phone: cleanOptionalString(parsed.phone),
          company: cleanOptionalString(parsed.company),
          status: parsed.status,
          source: parsed.source,
          language: parsed.language,
          currency: parsed.currency,
          tags: parsed.tags,
        });
        imported += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          index: i,
          reason: error instanceof Error ? error.message : 'Invalid row',
        });
      }
    }

    return NextResponse.json({
      data: {
        imported,
        skipped,
        errors,
      },
    });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/import POST]', error);
    return NextResponse.json({ error: 'Failed to import clients' }, { status: 500 });
  }
}
