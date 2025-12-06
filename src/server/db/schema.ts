import {
	index,
	integer,
	pgTableCreator,
	primaryKey,
	real,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

/**
 * Multi-project schema for 402 Dollar Homepage
 * Tables prefixed with "xf_" for this project
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `xf_${name}`);

/**
 * Pixels table - stores the state of each pixel on the canvas
 * - x, y: coordinates (0-999)
 * - color: hex color string
 * - owner: wallet address or user identifier
 * - timestamp: last update time
 * - price: current price in cents (starts at 1, increments each update)
 * - updateCount: number of times this pixel has been updated
 */
export const pixels = createTable(
	"pixels",
	(_d) => ({
		x: integer().notNull(),
		y: integer().notNull(),
		color: varchar({ length: 7 }).notNull().default("#000000"),
		owner: varchar({ length: 256 }).notNull(),
		timestamp: timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		price: real().notNull().default(0.01),
		updateCount: integer().notNull().default(1),
	}),
	(t) => [
		primaryKey({ columns: [t.x, t.y] }),
		index("pixel_owner_idx").on(t.owner),
		index("pixel_timestamp_idx").on(t.timestamp),
	],
);

/**
 * Payments table - tracks all payment transactions
 */
export const payments = createTable(
	"payments",
	(_d) => ({
		id: integer().primaryKey().generatedByDefaultAsIdentity(),
		pixelX: integer().notNull(),
		pixelY: integer().notNull(),
		owner: varchar({ length: 256 }).notNull(),
		amount: real().notNull(),
		nonce: varchar({ length: 256 }).notNull().unique(),
		paymentHash: varchar({ length: 256 }),
		createdAt: timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [
		index("payment_owner_idx").on(t.owner),
		index("payment_nonce_idx").on(t.nonce),
	],
);

// Type exports for use in application
export type Pixel = typeof pixels.$inferSelect;
export type NewPixel = typeof pixels.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
