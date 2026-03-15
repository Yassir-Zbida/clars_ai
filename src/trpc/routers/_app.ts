import { createTRPCRouter } from '../init';
import { clientsRouter } from '@/server/routers/clients';

export const appRouter = createTRPCRouter({
  clients: clientsRouter,
});

export type AppRouter = typeof appRouter;
