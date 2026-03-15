import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { prisma } from '@/server/db';

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const list = await prisma.client.findMany({
      where: { userId: ctx.userId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        healthScore: true,
        createdAt: true,
      },
    });
    return list;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const client = await prisma.client.findFirst({
        where: { id: input.id, userId: ctx.userId, deletedAt: null },
      });
      return client;
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
      const client = await prisma.client.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          address: input.address,
          notes: input.notes,
        },
      });
      return client;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const client = await prisma.client.updateMany({
        where: { id, userId: ctx.userId, deletedAt: null },
        data,
      });
      return client.count > 0;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.client.updateMany({
        where: { id: input.id, userId: ctx.userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return true;
    }),
});
