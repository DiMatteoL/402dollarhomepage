import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/server/db";
import { payments, pixels } from "~/server/db/schema";

// x402 imports
import {
  type PaymentPayload,
  type PaymentRequirements,
  PaymentPayloadSchema,
} from "x402/types";
import { safeBase64Decode } from "x402/shared";
import { useFacilitator } from "x402/verify";
import { facilitator as cdpFacilitatorConfig } from "@coinbase/x402";

// Configuration
const CANVAS_SIZE = 1000;
const BASE_PRICE_CENTS = 1; // $0.01 = 1 cent
const X402_VERSION = 1;
const MAX_CLAIMS = 10; // Maximum number of times a pixel can be claimed

// Get x402 configuration from environment
const NETWORK = (process.env.NEXT_PUBLIC_X402_NETWORK ??
  "base-sepolia") as PaymentRequirements["network"];
const PAY_TO_ADDRESS =
  process.env.X402_PAY_TO_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

// USDC contract config per network
const USDC_CONFIG: Record<
  string,
  { address: `0x${string}`; name: string; version: string }
> = {
  "base-sepolia": {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    name: "USDC",
    version: "2",
  },
  base: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin",
    version: "2",
  },
};

// Single pixel in batch request
const PixelSchema = z.object({
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
});

// Batch request body schema
const BatchPaintRequestSchema = z.object({
  pixels: z.array(PixelSchema).min(1).max(100), // Limit to 100 pixels per batch
});

/**
 * Calculate total price for a batch of pixels in USDC atomic units (6 decimals)
 */
function calculateBatchPriceInAtomicUnits(
  pixelUpdates: Array<{ x: number; y: number; currentUpdateCount: number }>
): string {
  let totalCents = 0;
  for (const pixel of pixelUpdates) {
    totalCents += BASE_PRICE_CENTS * (pixel.currentUpdateCount + 1);
  }
  // USDC has 6 decimals, so $0.01 = 10000 atomic units
  return (totalCents * 10000).toString();
}

/**
 * Create payment requirements for batch x402 payment
 */
function createBatchPaymentRequirements(
  pixelUpdates: Array<{ x: number; y: number; currentUpdateCount: number }>,
  requestUrl: string
): PaymentRequirements {
  const usdcConfig = USDC_CONFIG[NETWORK];
  if (!usdcConfig) {
    throw new Error(`Unsupported network: ${NETWORK}`);
  }

  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: calculateBatchPriceInAtomicUnits(pixelUpdates),
    resource: requestUrl,
    description: `Paint ${pixelUpdates.length} pixel${
      pixelUpdates.length !== 1 ? "s" : ""
    } on 402 Dollar Homepage`,
    mimeType: "application/json",
    payTo: PAY_TO_ADDRESS as `0x${string}`,
    maxTimeoutSeconds: 300, // 5 minutes
    asset: usdcConfig.address,
    extra: {
      name: usdcConfig.name,
      version: usdcConfig.version,
    },
  };
}

/**
 * Parse and validate the X-PAYMENT header
 */
function parsePaymentHeader(header: string): PaymentPayload | null {
  try {
    const decoded = safeBase64Decode(header);
    const parsed = JSON.parse(decoded);
    const validated = PaymentPayloadSchema.parse(parsed);
    return validated;
  } catch {
    return null;
  }
}

/**
 * Handle batch pixel painting with x402 payment flow
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const parseResult = BatchPaintRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { pixels: pixelRequests } = parseResult.data;
    const requestUrl = request.url;

    // Get current state of all requested pixels
    const pixelKeys = pixelRequests.map((p) => `${p.x}-${p.y}`);
    const existingPixels = await db
      .select()
      .from(pixels)
      .where(
        sql`(${pixels.x}::text || '-' || ${pixels.y}::text) IN (${sql.join(
          pixelKeys.map((k) => sql`${k}`),
          sql`, `
        )})`
      );

    // Create a map for quick lookup
    const existingMap = new Map(
      existingPixels.map((p) => [`${p.x}-${p.y}`, p])
    );

    // Build pixel updates with current state
    const pixelUpdates = pixelRequests.map((req) => {
      const existing = existingMap.get(`${req.x}-${req.y}`);
      return {
        x: req.x,
        y: req.y,
        color: req.color,
        currentUpdateCount: existing?.updateCount ?? 0,
      };
    });

    // Check if any pixel has reached max claims
    const maxedPixels = pixelUpdates.filter(
      (p) => p.currentUpdateCount >= MAX_CLAIMS
    );
    if (maxedPixels.length > 0) {
      return NextResponse.json(
        {
          error: "Some pixels have reached claim limit",
          message: `${maxedPixels.length} pixel(s) have already been claimed ${MAX_CLAIMS} times.`,
          maxedPixels: maxedPixels.map((p) => ({ x: p.x, y: p.y })),
        },
        { status: 403 }
      );
    }

    // Create payment requirements for the batch
    const paymentRequirements = createBatchPaymentRequirements(
      pixelUpdates,
      requestUrl
    );

    // Check for X-PAYMENT header
    const paymentHeader = request.headers.get("X-PAYMENT");

    if (!paymentHeader) {
      // Return 402 Payment Required with payment requirements
      return NextResponse.json(
        {
          x402Version: X402_VERSION,
          accepts: [paymentRequirements],
          error: "Payment required",
          pixelCount: pixelUpdates.length,
          totalPriceCents: pixelUpdates.reduce(
            (sum, p) => sum + BASE_PRICE_CENTS * (p.currentUpdateCount + 1),
            0
          ),
        },
        {
          status: 402,
          headers: {
            "X-PAYMENT-REQUIRED": "true",
          },
        }
      );
    }

    // Parse payment payload
    const paymentPayload = parsePaymentHeader(paymentHeader);

    if (!paymentPayload) {
      return NextResponse.json(
        { error: "Invalid X-PAYMENT header" },
        { status: 400 }
      );
    }

    // Verify and settle the payment using CDP facilitator
    console.log("[x402-batch] === VERIFICATION DEBUG ===");
    console.log("[x402-batch] Pixel count:", pixelUpdates.length);
    console.log("[x402-batch] Network:", NETWORK);
    console.log("[x402-batch] Amount:", paymentRequirements.maxAmountRequired);

    const facilitator = useFacilitator(cdpFacilitatorConfig);

    let verifyResult;
    try {
      verifyResult = await facilitator.verify(
        paymentPayload,
        paymentRequirements
      );
      console.log(
        "[x402-batch] Verify result:",
        JSON.stringify(verifyResult, null, 2)
      );
    } catch (verifyError) {
      console.error("[x402-batch] Facilitator verify threw:", verifyError);
      throw verifyError;
    }

    if (!verifyResult.isValid) {
      return NextResponse.json(
        {
          error: "Payment verification failed",
          reason: verifyResult.invalidReason,
        },
        { status: 402 }
      );
    }

    // Settle the payment
    const settleResult = await facilitator.settle(
      paymentPayload,
      paymentRequirements
    );

    if (!settleResult.success) {
      return NextResponse.json(
        {
          error: "Payment settlement failed",
          reason: settleResult.errorReason,
        },
        { status: 402 }
      );
    }

    // Extract payer address from payload
    const payerAddress =
      "authorization" in paymentPayload.payload
        ? paymentPayload.payload.authorization.from
        : "unknown";

    const now = new Date();
    const txHash = settleResult.transaction ?? "";
    const txId = settleResult.transaction ?? Date.now().toString();

    // Build all payment records for bulk insert
    const paymentRecords = pixelUpdates.map((p) => ({
      pixelX: p.x,
      pixelY: p.y,
      owner: payerAddress,
      amount: (BASE_PRICE_CENTS * (p.currentUpdateCount + 1)) / 100,
      nonce: `${txId}-${p.x}-${p.y}`,
      paymentHash: txHash,
    }));

    // Build all pixel records for bulk upsert
    const pixelRecords = pixelUpdates.map((p) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      owner: payerAddress,
      timestamp: now,
      price: (BASE_PRICE_CENTS * (p.currentUpdateCount + 2)) / 100,
      updateCount: p.currentUpdateCount + 1,
    }));

    // Bulk insert payments (single query)
    await db.insert(payments).values(paymentRecords);

    // Bulk upsert pixels using raw SQL for ON CONFLICT
    // This handles both new pixels and updates in a single query
    const timestampStr = now.toISOString();
    await db.execute(sql`
      INSERT INTO xf_pixels (x, y, color, owner, timestamp, price, "updateCount")
      VALUES ${sql.join(
        pixelRecords.map(
          (p) =>
            sql`(${p.x}, ${p.y}, ${p.color}, ${p.owner}, ${timestampStr}::timestamptz, ${p.price}, ${p.updateCount})`
        ),
        sql`, `
      )}
      ON CONFLICT (x, y) DO UPDATE SET
        color = EXCLUDED.color,
        owner = EXCLUDED.owner,
        timestamp = EXCLUDED.timestamp,
        price = EXCLUDED.price,
        "updateCount" = EXCLUDED."updateCount"
    `);

    // Build response
    const updatedPixels = pixelUpdates.map((p) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      updateCount: p.currentUpdateCount + 1,
    }));

    // Return success with settlement info
    return NextResponse.json(
      {
        success: true,
        pixels: updatedPixels,
        pixelCount: updatedPixels.length,
        settlement: {
          transaction: settleResult.transaction,
          network: paymentRequirements.network,
        },
      },
      {
        status: 200,
        headers: {
          "X-PAYMENT-RESPONSE": settleResult.transaction
            ? Buffer.from(
                JSON.stringify({
                  success: true,
                  transaction: settleResult.transaction,
                  network: paymentRequirements.network,
                  payer: payerAddress,
                  pixelCount: updatedPixels.length,
                })
              ).toString("base64")
            : "",
        },
      }
    );
  } catch (error) {
    console.error("Error in batch paint pixels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
