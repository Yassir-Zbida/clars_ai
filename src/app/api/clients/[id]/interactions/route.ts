import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Interaction } from '@/server/models/interaction';
import { recalculateClientHealthScore } from '@/server/clients/metrics';
import { CreateInteractionSchema, asObjectId, requireUserId, zodErrorResponse } from '../../_lib';

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const clientId = asObjectId(params.id);
    const exists = await Client.exists({
      _id: clientId,
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: { $in: [null, undefined] },
    });
    if (!exists) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20) || 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Interaction.find({ clientId }).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Interaction.countDocuments({ clientId }),
    ]);

    return NextResponse.json({
      data: rows.map((row) => ({ ...row, id: String(row._id), clientId: String(row.clientId) })),
      total,
      page,
      limit,
      hasMore: skip + rows.length < total,
    });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/interactions GET]', error);
    return NextResponse.json({ error: 'Failed to load interactions' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const clientId = asObjectId(params.id);
    const exists = await Client.exists({
      _id: clientId,
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: { $in: [null, undefined] },
    });
    if (!exists) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const payload = CreateInteractionSchema.parse(await request.json());
    const interaction = await Interaction.create({
      clientId,
      userId: new mongoose.Types.ObjectId(authRes.userId),
      type: payload.type,
      title: payload.title.trim(),
      note: payload.note?.trim() || undefined,
      date: payload.date ? new Date(payload.date) : new Date(),
    });

    await recalculateClientHealthScore(clientId);

    return NextResponse.json({ data: interaction.toJSON() }, { status: 201 });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/interactions POST]', error);
    return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 });
  }
}
