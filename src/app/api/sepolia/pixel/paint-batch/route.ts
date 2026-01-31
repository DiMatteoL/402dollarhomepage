import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/server/db";
import { sepoliaPayments, sepoliaPixels } from "~/server/db/schema";

export const maxDuration = 30;

// x402 imports
import {
  type PaymentPayload,
  type PaymentRequirements,
  PaymentPayloadSchema,
} from "x402/types";
import { safeBase64Decode } from "x402/shared";
import { useFacilitator } from "x402/verify";
import { facilitator as cdpFacilitatorConfig } from "@coinbase/x402";

// Sepolia testnet configuration
const CANVAS_SIZE = 100; // 100x100 for testnet
const BASE_PRICE_CENTS = 1;
const X402_VERSION = 1;
const MAX_CLAIMS = 10;

const NETWORK = "base-sepolia" as PaymentRequirements["network"];
const PAY_TO_ADDRESS =
  process.env.SEPOLIA_X402_PAY_TO_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

const USDC_CONFIG = {
  address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  name: "USDC",
  version: "2",
};

const PixelSchema = z.object({
  x: z.number().int().min(0).max(CANVAS_SIZE - 1),
  y: z.number().int().min(0).max(CANVAS_SIZE - 1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const BatchPaintRequestSchema = z.object({
  pixels: z.array(PixelSchema).min(1).max(100),
});

function calculateBatchPriceInAtomicUnits(
  pixelUpdates: Array<{ x: number; y: number; currentUpdateCount: number }>
): string {
  let totalCents = 0;
  for (const pixel of pixelUpdates) {
    totalCents += BASE_PRICE_CENTS * (pixel.currentUpdateCount + 1);
  }
  return (totalCents * 10000).toString();
}

function createBatchPaymentRequirements(
  pixelUpdates: Array<{ x: number; y: number; currentUpdateCount: number }>,
  requestUrl: string
): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: calculateBatchPriceInAtomicUnits(pixelUpdates),
    resource: requestUrl,
    description: `[TESTNET] Paint ${pixelUpdates.length} pixel${
      pixelUpdates.length !== 1 ? "s" : ""
    } on Sepolia Canvas`,
    mimeType: "application/json",
    payTo: PAY_TO_ADDRESS as `0x${string}`,
    maxTimeoutSeconds: 300,
    asset: USDC_CONFIG.address,
    extra: {
      name: USDC_CONFIG.name,
      version: USDC_CONFIG.version,
    },
  };
}

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

export async function POST(request: NextRequest) {
  try {
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
      .from(sepoliaPixels)
      .where(
        sql`(${sepoliaPixels.x}::text || '-' || ${sepoliaPixels.y}::text) IN (${sql.join(
          pixelKeys.map((k) => sql`${k}`),
          sql`, `
        )})`
      );

    const existingMap = new Map(
      existingPixels.map((p) => [`${p.x}-${p.y}`, p])
    );

    const pixelUpdates = pixelRequests.map((req) => {
      const existing = existingMap.get(`${req.x}-${req.y}`);
      return {
        x: req.x,
        y: req.y,
        color: req.color,
        currentUpdateCount: existing?.updateCount ?? 0,
      };
    });

    // Check max claims
    const maxedPixels = pixelUpdates.filter(
      (p) => p.currentUpdateCount >= MAX_CLAIMS
    );
    if (maxedPixels.length > 0) {
      return NextResponse.json(
        {
          error: "Some pixels have reached claim limit",
          message: `${maxedPixels.length} pixel(s) have been claimed ${MAX_CLAIMS} times.`,
          maxedPixels: maxedPixels.map((p) => ({ x: p.x, y: p.y })),
        },
        { status: 403 }
      );
    }

    const paymentRequirements = createBatchPaymentRequirements(
      pixelUpdates,
      requestUrl
    );

    const paymentHeader = request.headers.get("X-PAYMENT");

    if (!paymentHeader) {
      return NextResponse.json(
        {
          x402Version: X402_VERSION,
          accepts: [paymentRequirements],
          error: "Payment required",
          testnet: true,
          network: "base-sepolia",
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

    const paymentPayload = parsePaymentHeader(paymentHeader);

    if (!paymentPayload) {
      return NextResponse.json(
        { error: "Invalid X-PAYMENT header" },
        { status: 400 }
      );
    }

    console.log("[sepolia-x402-batch] Verifying payment on Base Sepolia");
    const facilitator = useFacilitator(cdpFacilitatorConfig);

    const verifyResult = await facilitator.verify(
      paymentPayload,
      paymentRequirements
    );

    if (!verifyResult.isValid) {
      return NextResponse.json(
        {
          error: "Payment verification failed",
          reason: verifyResult.invalidReason,
        },
        { status: 402 }
      );
    }

    // Settle with retry logic
    let settleResult;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[sepolia-x402-batch] Settlement attempt ${attempt}/${maxRetries}`);
        settleResult = await facilitator.settle(
          paymentPayload,
          paymentRequirements
        );
        break;
      } catch (settleError) {
        const errorMessage = settleError instanceof Error ? settleError.message : String(settleError);
        console.error(`[sepolia-x402-batch] Settlement attempt ${attempt} failed:`, errorMessage);

        const isRetryable = errorMessage.includes('timeout') ||
                           errorMessage.includes('504') ||
                           errorMessage.includes('503') ||
                           errorMessage.includes('ECONNRESET') ||
                           errorMessage.includes('network');

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          return NextResponse.json(
            {
              error: "Payment settlement failed",
              reason: `Settlement timed out after ${maxRetries} attempts.`,
            },
            { status: 402 }
          );
        }
      }
    }

    if (!settleResult || !settleResult.success) {
      return NextResponse.json(
        {
          error: "Payment settlement failed",
          reason: settleResult?.errorReason ?? "Unknown error",
        },
        { status: 402 }
      );
    }

    const payerAddress =
      "authorization" in paymentPayload.payload
        ? paymentPayload.payload.authorization.from
        : "unknown";

    const now = new Date();
    const txHash = settleResult.transaction ?? "";
    const txId = settleResult.transaction ?? Date.now().toString();

    const paymentRecords = pixelUpdates.map((p) => ({
      pixelX: p.x,
      pixelY: p.y,
      owner: payerAddress,
      amount: (BASE_PRICE_CENTS * (p.currentUpdateCount + 1)) / 100,
      nonce: `${txId}-${p.x}-${p.y}`,
      paymentHash: txHash,
    }));

    const pixelRecords = pixelUpdates.map((p) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      owner: payerAddress,
      timestamp: now,
      price: (BASE_PRICE_CENTS * (p.currentUpdateCount + 2)) / 100,
      updateCount: p.currentUpdateCount + 1,
    }));

    // Debug: check current role
    const roleResult = await db.execute(sql`SELECT current_user, session_user`);
    console.log("[sepolia-debug] DB connection role:", roleResult);
    
    await db.insert(sepoliaPayments).values(paymentRecords);

    const timestampStr = now.toISOString();
    await db.execute(sql`
      INSERT INTO xf_sepolia_pixels (x, y, color, owner, timestamp, price, "updateCount")
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

    const updatedPixels = pixelUpdates.map((p) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      updateCount: p.currentUpdateCount + 1,
    }));

    return NextResponse.json(
      {
        success: true,
        testnet: true,
        pixels: updatedPixels,
        pixelCount: updatedPixels.length,
        settlement: {
          transaction: settleResult.transaction,
          network: NETWORK,
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
                  network: NETWORK,
                  payer: payerAddress,
                  pixelCount: updatedPixels.length,
                })
              ).toString("base64")
            : "",
        },
      }
    );
  } catch (error) {
    console.error("Error in sepolia batch paint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
