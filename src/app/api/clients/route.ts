import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Contact } from '@/server/models/contact';
import {
  CreateClientSchema,
  cleanOptionalString,
  parseClientListQuery,
  requireUserId,
  zodErrorResponse,
} from './_lib';

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    const { userId } = authRes;

    await getDb();
    const query = parseClientListQuery(request);

    const mongoQuery: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      deletedAt: { $in: [null, undefined] },
      isArchived: query.isArchived,
    };

    if (query.search) {
      const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      mongoQuery.$or = [{ fullName: searchRegex }, { email: searchRegex }, { company: searchRegex }];
    }
    if (query.status.length) mongoQuery.status = { $in: query.status };
    if (query.healthLabel.length) mongoQuery.healthLabel = { $in: query.healthLabel };
    if (query.source.length) mongoQuery.source = { $in: query.source };
    if (query.tags.length) mongoQuery.tags = { $in: query.tags };
    if (query.type) mongoQuery.type = query.type;
    if (query.currency) mongoQuery.currency = query.currency;
    if (query.isFavorite !== undefined) mongoQuery.isFavorite = query.isFavorite;
    if (query.minRevenue !== undefined || query.maxRevenue !== undefined) {
      mongoQuery.totalRevenue = {
        ...(query.minRevenue !== undefined ? { $gte: query.minRevenue } : {}),
        ...(query.maxRevenue !== undefined ? { $lte: query.maxRevenue } : {}),
      };
    }

    const sortOrder = query.sortDir === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: sortOrder };
    if (query.sortBy !== 'fullName') sort.fullName = 1;

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      Client.find(mongoQuery).sort(sort).skip(skip).limit(query.limit).lean(),
      Client.countDocuments(mongoQuery),
    ]);

    return NextResponse.json({
      data: rows.map((row: Record<string, unknown>) => ({
        ...row,
        id: String(row._id),
        name: row.fullName,
      })),
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + rows.length < total,
    });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients GET]', error);
    return NextResponse.json({ error: 'Failed to list clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    const { userId } = authRes;

    const payload = CreateClientSchema.parse(await request.json());
    await getDb();

    const client = await Client.create({
      userId: new mongoose.Types.ObjectId(userId),
      fullName: payload.fullName.trim(),
      email: cleanOptionalString(payload.email),
      phone: cleanOptionalString(payload.phone),
      avatarUrl: cleanOptionalString(payload.avatarUrl),
      company: cleanOptionalString(payload.company),
      jobTitle: cleanOptionalString(payload.jobTitle),
      website: cleanOptionalString(payload.website),
      birthday: payload.birthday ? new Date(payload.birthday) : undefined,
      type: payload.type,
      status: payload.status,
      source: payload.source,
      industry: cleanOptionalString(payload.industry),
      language: payload.language,
      country: cleanOptionalString(payload.country),
      city: cleanOptionalString(payload.city),
      address: cleanOptionalString(payload.address),
      timezone: cleanOptionalString(payload.timezone),
      currency: payload.currency,
      defaultRate: payload.defaultRate,
      notes: cleanOptionalString(payload.notes),
      tags: payload.tags,
      isFavorite: payload.isFavorite,
      firstContactAt: payload.firstContactAt ? new Date(payload.firstContactAt) : undefined,
      nextFollowUpAt: payload.nextFollowUpAt ? new Date(payload.nextFollowUpAt) : undefined,
    });

    if (payload.type === 'COMPANY') {
      await Contact.create({
        clientId: client._id,
        fullName: payload.fullName,
        email: cleanOptionalString(payload.email),
        phone: cleanOptionalString(payload.phone),
        jobTitle: cleanOptionalString(payload.jobTitle),
        isPrimary: true,
      });
    }

    const data = client.toJSON() as Record<string, unknown>;
    return NextResponse.json({ data: { ...data, name: data.fullName } }, { status: 201 });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients POST]', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
