import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Invoice } from '@/server/models/invoice';
import { Project } from '@/server/models/project';
import { asObjectId, requireUserId, zodErrorResponse } from '../../_lib';

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const clientId = asObjectId(params.id);
    const client = (await Client.findOne({
      _id: clientId,
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: { $in: [null, undefined] },
    })
      .select('totalRevenue totalPaid totalUnpaid totalOverdue')
      .lean()) as
      | { totalRevenue?: number; totalPaid?: number; totalUnpaid?: number; totalOverdue?: number }
      | null;
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const [projectsCount, invoicesCount] = await Promise.all([
      Project.countDocuments({
        deletedAt: { $in: [null, undefined] },
        $or: [{ clientId }, { assignedClientIds: clientId }],
      }),
      Invoice.countDocuments({ clientId, deletedAt: { $in: [null, undefined] } }),
    ]);

    return NextResponse.json({
      data: {
        totalRevenue: client.totalRevenue ?? 0,
        totalPaid: client.totalPaid ?? 0,
        totalUnpaid: client.totalUnpaid ?? 0,
        totalOverdue: client.totalOverdue ?? 0,
        projectsCount,
        invoicesCount,
      },
    });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/stats GET]', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
