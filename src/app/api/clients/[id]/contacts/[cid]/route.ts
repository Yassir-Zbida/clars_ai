import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Contact } from '@/server/models/contact';
import { asObjectId, requireUserId, zodErrorResponse } from '../../../_lib';

type Params = { params: { id: string; cid: string } };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId();
    if ('error' in authRes) return authRes.error;
    await getDb();

    const clientId = asObjectId(params.id);
    const contactId = asObjectId(params.cid);

    const exists = await Client.exists({
      _id: clientId,
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: { $in: [null, undefined] },
    });
    if (!exists) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const result = await Contact.deleteOne({
      _id: contactId,
      clientId,
    });
    if (!result.deletedCount) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    return NextResponse.json({ data: true });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/contacts/:cid DELETE]', error);
    return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 });
  }
}
