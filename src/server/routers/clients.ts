import { z } from 'zod';
import mongoose from 'mongoose';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';

const objectIdString = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid id');

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    await getDb();
    const list = await Client.find({
      userId: new mongoose.Types.ObjectId(ctx.userId),
      deletedAt: { $in: [null, undefined] },
    })
    .sort({ fullName: 1 })
      .lean() as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; email?: string; company?: string; healthScore?: number; createdAt?: Date }[];
    return list.map((doc) => ({
      id: doc._id.toString(),
      name: doc.fullName ?? doc.name ?? 'Unknown',
      email: doc.email,
      company: doc.company,
      healthScore: doc.healthScore,
      createdAt: doc.createdAt,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: objectIdString }))
    .query(async ({ ctx, input }) => {
      await getDb();
      const client = await Client.findOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: ctx.userId,
        deletedAt: { $in: [null, undefined] },
      }).lean() as { _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; fullName?: string; name?: string; email?: string; phone?: string; company?: string; address?: string; notes?: string; healthScore?: number; createdAt?: Date; updatedAt?: Date } | null;
      if (!client) return null;
      return {
        ...client,
        name: client.fullName ?? client.name ?? 'Unknown',
        id: client._id.toString(),
        userId: client.userId.toString(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getDb();
      const doc = await Client.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        fullName: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        address: input.address,
        notes: input.notes,
      });
      return doc.toJSON();
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectIdString,
        name: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getDb();
      const { id, ...data } = input;
      const cleanData: Record<string, unknown> = {};
      if (data.name !== undefined) cleanData.fullName = data.name;
      if (data.email !== undefined) cleanData.email = data.email;
      if (data.phone !== undefined) cleanData.phone = data.phone;
      if (data.company !== undefined) cleanData.company = data.company;
      if (data.address !== undefined) cleanData.address = data.address;
      if (data.notes !== undefined) cleanData.notes = data.notes;
      const result = await Client.updateOne(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: ctx.userId,
          deletedAt: { $in: [null, undefined] },
        },
        { $set: cleanData }
      );
      return result.matchedCount > 0;
    }),

  delete: protectedProcedure
    .input(z.object({ id: objectIdString }))
    .mutation(async ({ ctx, input }) => {
      await getDb();
      await Client.updateOne(
        {
          _id: new mongoose.Types.ObjectId(input.id),
          userId: ctx.userId,
          deletedAt: { $in: [null, undefined] },
        },
        { $set: { deletedAt: new Date() } }
      );
      return true;
    }),
});
