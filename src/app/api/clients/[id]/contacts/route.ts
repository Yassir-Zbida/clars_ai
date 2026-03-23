import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Contact } from '@/server/models/contact';
import { CreateContactSchema, asObjectId, cleanOptionalString, requireUserId, zodErrorResponse } from '../../_lib';

type Params = { params: { id: string } };

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

    const payload = CreateContactSchema.parse(await request.json());
    if (payload.isPrimary) {
      await Contact.updateMany({ clientId }, { $set: { isPrimary: false } });
    }

    const contact = await Contact.create({
      clientId,
      fullName: payload.fullName.trim(),
      email: cleanOptionalString(payload.email),
      phone: cleanOptionalString(payload.phone),
      jobTitle: cleanOptionalString(payload.jobTitle),
      isPrimary: payload.isPrimary,
    });

    return NextResponse.json({ data: contact.toJSON() }, { status: 201 });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/contacts POST]', error);
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
  }
}
