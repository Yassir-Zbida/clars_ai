import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { Contact } from '@/server/models/contact';
import { CreateContactSchema, asObjectId, cleanOptionalString, requireUserId, zodErrorResponse } from '../../../_lib';

type Params = { params: { id: string; cid: string } };

const UpdateContactSchema = CreateContactSchema.partial();

export async function PUT(request: Request, { params }: Params) {
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

    const input = UpdateContactSchema.parse(await request.json());

    if (input.isPrimary === true) {
      await Contact.updateMany({ clientId }, { $set: { isPrimary: false } });
    }

    const setPayload: Record<string, unknown> = {};
    if (input.fullName !== undefined) setPayload.fullName = input.fullName.trim();
    if (input.email !== undefined) setPayload.email = cleanOptionalString(input.email);
    if (input.phone !== undefined) setPayload.phone = cleanOptionalString(input.phone);
    if (input.jobTitle !== undefined) setPayload.jobTitle = cleanOptionalString(input.jobTitle);
    if (input.isPrimary !== undefined) setPayload.isPrimary = input.isPrimary;

    const updated = await Contact.findOneAndUpdate(
      { _id: contactId, clientId },
      { $set: setPayload },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    return NextResponse.json({ data: { ...updated, id: String((updated as { _id: unknown })._id) } });
  } catch (error) {
    const zodResponse = zodErrorResponse(error);
    if (zodResponse) return zodResponse;
    console.error('[api/clients/:id/contacts/:cid PUT]', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

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
