import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Contact } from '@/server/models/contact';
import { Interaction } from '@/server/models/interaction';
import { Invoice } from '@/server/models/invoice';
import { Project } from '@/server/models/project';
import { UpdateClientSchema, asObjectId, cleanOptionalString, requireUserId, zodErrorResponse } from '../_lib';

type Params = { params: { id: string } };

async function loadClientWithRelations(userId: string, clientId: mongoose.Types.ObjectId) {
  const baseQuery = {
    _id: clientId,
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: { $in: [null, undefined] },
  };
  const [client, contacts, interactions, projects, invoices] = await Promise.all([
    Client.findOne(baseQuery).lean(),
    Contact.find({ clientId }).sort({ createdAt: -1 }).lean(),
    Interaction.find({ clientId }).sort({ date: -1 }).limit(100).lean(),
    Project.find({
      deletedAt: { $in: [null, undefined] },
      $or: [{ clientId }, { assignedClientIds: clientId }],
    })
      .sort({ createdAt: -1 })
      .lean(),
    Invoice.find({ clientId, deletedAt: { $in: [null, undefined] } }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!client) return null;

  return {
    ...client,
    id: String((client as Record<string, unknown>)._id),
    name: (client as Record<string, unknown>).fullName,
    contacts: contacts.map((c) => ({ ...c, id: String(c._id), clientId: String(c.clientId) })),
    interactions: interactions.map((i) => ({
      ...i,
      id: String(i._id),
      clientId: String(i.clientId),
      userId: String(i.userId),
    })),
    projects: projects.map((p) => ({ ...p, id: String(p._id) })),
    invoices: invoices.map((inv) => ({ ...inv, id: String(inv._id) })),
    quotes: [],
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const client = await loadClientWithRelations(authRes.userId, asObjectId(params.id));
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ data: client });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id GET]', error);
    return NextResponse.json({ error: 'Failed to load client' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const input = UpdateClientSchema.parse(await request.json());
    const id = asObjectId(params.id);

    const setPayload: Record<string, unknown> = {};
    if (input.fullName !== undefined) setPayload.fullName = input.fullName.trim();
    if (input.email !== undefined) setPayload.email = cleanOptionalString(input.email);
    if (input.phone !== undefined) setPayload.phone = cleanOptionalString(input.phone);
    if (input.avatarUrl !== undefined) setPayload.avatarUrl = cleanOptionalString(input.avatarUrl);
    if (input.company !== undefined) setPayload.company = cleanOptionalString(input.company);
    if (input.jobTitle !== undefined) setPayload.jobTitle = cleanOptionalString(input.jobTitle);
    if (input.website !== undefined) setPayload.website = cleanOptionalString(input.website);
    if (input.birthday !== undefined) {
      setPayload.birthday = input.birthday ? new Date(input.birthday) : undefined;
    }
    if (input.type !== undefined) setPayload.type = input.type;
    if (input.status !== undefined) setPayload.status = input.status;
    if (input.source !== undefined) setPayload.source = input.source;
    if (input.industry !== undefined) setPayload.industry = cleanOptionalString(input.industry);
    if (input.language !== undefined) setPayload.language = input.language;
    if (input.country !== undefined) setPayload.country = cleanOptionalString(input.country);
    if (input.city !== undefined) setPayload.city = cleanOptionalString(input.city);
    if (input.address !== undefined) setPayload.address = cleanOptionalString(input.address);
    if (input.timezone !== undefined) setPayload.timezone = cleanOptionalString(input.timezone);
    if (input.currency !== undefined) setPayload.currency = input.currency;
    if (input.defaultRate !== undefined) setPayload.defaultRate = input.defaultRate;
    if (input.notes !== undefined) setPayload.notes = cleanOptionalString(input.notes);
    if (input.tags !== undefined) setPayload.tags = input.tags;
    if (input.isFavorite !== undefined) setPayload.isFavorite = input.isFavorite;
    if (input.isArchived !== undefined) setPayload.isArchived = input.isArchived;
    if (input.healthScore !== undefined) setPayload.healthScore = input.healthScore;
    if (input.healthLabel !== undefined) setPayload.healthLabel = input.healthLabel;
    if (input.firstContactAt !== undefined) {
      setPayload.firstContactAt = input.firstContactAt ? new Date(input.firstContactAt) : undefined;
    }
    if (input.nextFollowUpAt !== undefined) {
      setPayload.nextFollowUpAt =
        input.nextFollowUpAt === null ? null : new Date(input.nextFollowUpAt);
    }

    const result = (await Client.findOneAndUpdate(
      {
        _id: id,
        userId: new mongoose.Types.ObjectId(authRes.userId),
        deletedAt: { $in: [null, undefined] },
      },
      { $set: setPayload },
      { new: true }
    ).lean()) as Record<string, unknown> | null;

    if (!result) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json({
      data: { ...result, id: String(result._id), name: String(result.fullName ?? '') },
    });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id PUT]', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();
    const id = asObjectId(params.id);

    const result = await Client.updateOne(
      {
        _id: id,
        userId: new mongoose.Types.ObjectId(authRes.userId),
        deletedAt: { $in: [null, undefined] },
      },
      { $set: { isArchived: true } }
    );

    if (!result.matchedCount) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ data: true });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id DELETE]', error);
    return NextResponse.json({ error: 'Failed to archive client' }, { status: 500 });
  }
}
