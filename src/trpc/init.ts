import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@/auth';
import superjson from 'superjson';

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth();
  return {
    headers: opts.req.headers,
    userId: session?.user?.id ?? null,
  };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Non authentifié' });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId },
  });
});
