import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { asObjectId, requireUserId, zodErrorResponse } from '../../_lib';
import { recalculateClientHealthScore } from '@/server/clients/metrics';

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
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

    const result = await recalculateClientHealthScore(clientId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/health POST]', error);
    return NextResponse.json({ error: 'Failed to recalculate health score' }, { status: 500 });
  }
}
