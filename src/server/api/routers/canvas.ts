import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { pixels } from "~/server/db/schema";

// Constants
const CANVAS_SIZE = 1000;
const BASE_PRICE = 0.01; // $0.01 per pixel initially

/**
 * Canvas router - handles read-only pixel operations
 *
 * NOTE: Pixel painting is now handled by the x402 API route at /api/pixel/paint
 * which implements the actual HTTP 402 payment flow with on-chain verification.
 */
export const canvasRouter = createTRPCRouter({
  /**
   * Get all pixels - returns the current state of the canvas
   */
  getCanvas: publicProcedure.query(async ({ ctx }) => {
    const allPixels = await ctx.db.select().from(pixels);
    return allPixels;
  }),

  /**
   * Get a single pixel by coordinates
   */
  getPixel: publicProcedure
    .input(
      z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(CANVAS_SIZE - 1),
        y: z
          .number()
          .int()
          .min(0)
          .max(CANVAS_SIZE - 1),
      })
    )
    .query(async ({ ctx, input }) => {
      const [pixel] = await ctx.db
        .select()
        .from(pixels)
        .where(and(eq(pixels.x, input.x), eq(pixels.y, input.y)));

      if (!pixel) {
        // Return default pixel state (unpurchased)
        return {
          x: input.x,
          y: input.y,
          color: "#1a1a2e",
          owner: null,
          price: BASE_PRICE,
          updateCount: 0,
          timestamp: null,
        };
      }

      return pixel;
    }),
});
