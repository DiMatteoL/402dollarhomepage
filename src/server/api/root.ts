import { canvasRouter } from "~/server/api/routers/canvas";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * Primary router for 402 Dollar Homepage
 */
export const appRouter = createTRPCRouter({
	canvas: canvasRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API
 */
export const createCaller = createCallerFactory(appRouter);
