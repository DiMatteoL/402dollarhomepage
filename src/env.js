import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Server-side environment variables schema
	 */
	server: {
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
		// x402 server configuration
		X402_PAY_TO_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
		X402_FACILITATOR_URL: z.string().url().optional(),
		// Sentry configuration
		SENTRY_DSN: z.string().url().optional(),
	},

	/**
	 * Client-side environment variables schema
	 * Exposed to the client via NEXT_PUBLIC_ prefix
	 */
	client: {
		NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
		NEXT_PUBLIC_PRIVY_APP_ID: z.string(),
		// x402 network configuration (used by both client and server)
		NEXT_PUBLIC_X402_NETWORK: z.enum([
			"base-sepolia", "base", "avalanche-fuji", "avalanche",
			"polygon", "polygon-amoy", "abstract", "abstract-testnet",
			"sei", "sei-testnet", "peaq", "story", "educhain", "iotex",
			"skale-base-sepolia", "solana-devnet", "solana"
		]).default("base-sepolia"),
		// Sentry DSN (public key)
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
	},

	/**
	 * Runtime env - manually destructure process.env
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
		NEXT_PUBLIC_X402_NETWORK: process.env.NEXT_PUBLIC_X402_NETWORK,
		// x402 server configuration
		X402_PAY_TO_ADDRESS: process.env.X402_PAY_TO_ADDRESS,
		X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL,
		// Sentry configuration
		SENTRY_DSN: process.env.SENTRY_DSN,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
	},

	/**
	 * Skip validation for Docker builds
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,

	/**
	 * Treat empty strings as undefined
	 */
	emptyStringAsUndefined: true,
});
