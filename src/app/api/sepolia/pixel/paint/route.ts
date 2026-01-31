import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/server/db";
import { sepoliaPayments, sepoliaPixels } from "~/server/db/schema";

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
const BASE_PRICE_CENTS = 1; // $0.01 = 1 cent
const X402_VERSION = 1;
const MAX_CLAIMS = 10;

// Fixed to Base Sepolia for testnet
const NETWORK = "base-sepolia" as PaymentRequirements["network"];
const PAY_TO_ADDRESS =
  process.env.SEPOLIA_X402_PAY_TO_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

// USDC contract config for Base Sepolia
const USDC_CONFIG = {
  address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  name: "USDC",
  version: "2",
};

// Request body schema
const PaintRequestSchema = z.object({
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

/**
 * Calculate the current price for a pixel in USDC atomic units (6 decimals)
 */
function calculatePriceInAtomicUnits(updateCount: number): string {
  const priceInCents = BASE_PRICE_CENTS * (updateCount + 1);
  return (priceInCents * 10000).toString();
}

/**
 * Create payment requirements for x402
 */
function createPaymentRequirements(
  x: number,
  y: number,
  updateCount: number,
  requestUrl: string
): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: calculatePriceInAtomicUnits(updateCount),
    resource: requestUrl,
    description: `[TESTNET] Paint pixel (${x}, ${y}) on Sepolia Canvas`,
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
 * Handle pixel painting with x402 payment flow (Sepolia testnet)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const parseResult = PaintRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { x, y, color } = parseResult.data;

    // Get current pixel state
    const [existingPixel] = await db
      .select()
      .from(sepoliaPixels)
      .where(and(eq(sepoliaPixels.x, x), eq(sepoliaPixels.y, y)));

    const currentUpdateCount = existingPixel?.updateCount ?? 0;
    const requestUrl = request.url;

    // Check if pixel has reached max claims
    if (currentUpdateCount >= MAX_CLAIMS) {
      return NextResponse.json(
        {
          error: "Pixel claim limit reached",
          message: `This pixel has already been claimed ${MAX_CLAIMS} times.`,
          maxClaims: MAX_CLAIMS,
          currentClaims: currentUpdateCount,
        },
        { status: 403 }
      );
    }

    // Create payment requirements
    const paymentRequirements = createPaymentRequirements(
      x,
      y,
      currentUpdateCount,
      requestUrl
    );

    // Check for X-PAYMENT header
    const paymentHeader = request.headers.get("X-PAYMENT");

    if (!paymentHeader) {
      return NextResponse.json(
        {
          x402Version: X402_VERSION,
          accepts: [paymentRequirements],
          error: "Payment required",
          testnet: true,
          network: "base-sepolia",
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

    // Verify and settle payment
    console.log("[sepolia-x402] Verifying payment on Base Sepolia");
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

    // Extract payer address
    const payerAddress =
      "authorization" in paymentPayload.payload
        ? paymentPayload.payload.authorization.from
        : "unknown";

    // Record payment
    await db.insert(sepoliaPayments).values({
      pixelX: x,
      pixelY: y,
      owner: payerAddress,
      amount: Number(paymentRequirements.maxAmountRequired) / 10000 / 100,
      nonce: settleResult.transaction ?? `${x}-${y}-${Date.now()}`,
      paymentHash: settleResult.transaction ?? "",
    });

    // Update or insert pixel
    const newPrice = (BASE_PRICE_CENTS * (currentUpdateCount + 2)) / 100;

    if (existingPixel) {
      await db
        .update(sepoliaPixels)
        .set({
          color: color,
          owner: payerAddress,
          timestamp: new Date(),
          price: newPrice,
          updateCount: currentUpdateCount + 1,
        })
        .where(and(eq(sepoliaPixels.x, x), eq(sepoliaPixels.y, y)));
    } else {
      await db.insert(sepoliaPixels).values({
        x: x,
        y: y,
        color: color,
        owner: payerAddress,
        timestamp: new Date(),
        price: newPrice,
        updateCount: 1,
      });
    }

    return NextResponse.json(
      {
        success: true,
        testnet: true,
        pixel: {
          x,
          y,
          color,
          owner: payerAddress,
          price: newPrice,
          updateCount: currentUpdateCount + 1,
        },
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
                })
              ).toString("base64")
            : "",
        },
      }
    );
  } catch (error) {
    console.error("Error in sepolia paint pixel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check pixel state and price
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const x = parseInt(searchParams.get("x") ?? "0", 10);
  const y = parseInt(searchParams.get("y") ?? "0", 10);

  if (
    isNaN(x) ||
    isNaN(y) ||
    x < 0 ||
    x >= CANVAS_SIZE ||
    y < 0 ||
    y >= CANVAS_SIZE
  ) {
    return NextResponse.json({ error: "Invalid coordinates (0-99)" }, { status: 400 });
  }

  const [pixel] = await db
    .select()
    .from(sepoliaPixels)
    .where(and(eq(sepoliaPixels.x, x), eq(sepoliaPixels.y, y)));

  const updateCount = pixel?.updateCount ?? 0;
  const paymentRequirements = createPaymentRequirements(
    x,
    y,
    updateCount,
    request.url
  );

  return NextResponse.json({
    testnet: true,
    network: "base-sepolia",
    pixel: pixel ?? {
      x,
      y,
      color: "#1a1a2e",
      owner: null,
      price: BASE_PRICE_CENTS / 100,
      updateCount: 0,
    },
    maxClaims: MAX_CLAIMS,
    paymentRequirements,
  });
}
