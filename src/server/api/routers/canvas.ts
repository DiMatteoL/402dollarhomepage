import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { payments, pixels } from "~/server/db/schema";

// Constants
const CANVAS_SIZE = 1000;
const BASE_PRICE = 0.01; // $0.01 per pixel initially

/**
 * Generate a unique nonce for payment verification
 */
function generateNonce(x: number, y: number): string {
	return `${x}-${y}-${Date.now()}`;
}

/**
 * Calculate the current price for a pixel based on update count
 * Price increases by $0.01 for each update
 */
function calculatePrice(updateCount: number): number {
	return Number((BASE_PRICE * (updateCount + 1)).toFixed(2));
}

/**
 * Canvas router - handles all pixel-related operations
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
			}),
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

	/**
	 * Paint a pixel - x402 payment flow
	 * If no payment header is provided, returns 402 with payment details
	 * If payment is valid, updates the pixel
	 */
	paintPixel: publicProcedure
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
				color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
				owner: z.string().min(1).max(256),
				paymentNonce: z.string().optional(),
				paymentHash: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get current pixel state
			const [existingPixel] = await ctx.db
				.select()
				.from(pixels)
				.where(and(eq(pixels.x, input.x), eq(pixels.y, input.y)));

			const currentUpdateCount = existingPixel?.updateCount ?? 0;
			const requiredPrice = calculatePrice(currentUpdateCount);

			// x402 Payment Flow: If no payment provided, return 402 error with payment details
			if (!input.paymentNonce || !input.paymentHash) {
				const nonce = generateNonce(input.x, input.y);

				throw new TRPCError({
					code: "PRECONDITION_FAILED", // Maps to 402 Payment Required
					message: JSON.stringify({
						type: "x402",
						amount: requiredPrice,
						currency: "USD",
						nonce: nonce,
						recipient: "402dollarhomepage",
						description: `Paint pixel (${input.x}, ${input.y})`,
						pixelInfo: {
							x: input.x,
							y: input.y,
							currentColor: existingPixel?.color ?? "#1a1a2e",
							currentOwner: existingPixel?.owner ?? null,
							updateCount: currentUpdateCount,
						},
					}),
				});
			}

			// Verify payment nonce format
			const nonceParts = input.paymentNonce.split("-");
			if (nonceParts.length !== 3) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid payment nonce format",
				});
			}

			const [nonceX, nonceY] = nonceParts.map(Number);
			if (nonceX !== input.x || nonceY !== input.y) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment nonce does not match pixel coordinates",
				});
			}

			// Check if nonce was already used (replay protection)
			const [existingPayment] = await ctx.db
				.select()
				.from(payments)
				.where(eq(payments.nonce, input.paymentNonce));

			if (existingPayment) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment nonce already used",
				});
			}

			// Record the payment
			await ctx.db.insert(payments).values({
				pixelX: input.x,
				pixelY: input.y,
				owner: input.owner,
				amount: requiredPrice,
				nonce: input.paymentNonce,
				paymentHash: input.paymentHash,
			});

			// Update or insert pixel
			const newPrice = calculatePrice(currentUpdateCount + 1);

			if (existingPixel) {
				// Update existing pixel
				await ctx.db
					.update(pixels)
					.set({
						color: input.color,
						owner: input.owner,
						timestamp: new Date(),
						price: newPrice,
						updateCount: currentUpdateCount + 1,
					})
					.where(and(eq(pixels.x, input.x), eq(pixels.y, input.y)));
			} else {
				// Insert new pixel
				await ctx.db.insert(pixels).values({
					x: input.x,
					y: input.y,
					color: input.color,
					owner: input.owner,
					timestamp: new Date(),
					price: newPrice,
					updateCount: 1,
				});
			}

			return {
				success: true,
				pixel: {
					x: input.x,
					y: input.y,
					color: input.color,
					owner: input.owner,
					price: newPrice,
					updateCount: (existingPixel?.updateCount ?? 0) + 1,
				},
			};
		}),
});
