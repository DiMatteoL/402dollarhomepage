import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { pixels } from "~/server/db/schema";

// Constants
const CANVAS_SIZE = 1000;
const BASE_PRICE = 0.01; // $0.01 per pixel initially

/**
 * Canvas router - handles pixel metadata queries
 *
 * NOTE: Bulk canvas data is served via /api/canvas/binary for efficiency
 * NOTE: Pixel painting is handled by /api/pixel/paint (HTTP 402 flow)
 */
export const canvasRouter = createTRPCRouter({
  /**
   * Get a single pixel's full metadata by coordinates
   * Used for displaying pixel details (owner, price, history)
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
        // Return default pixel state (unclaimed)
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
