import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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

// Configuration
const CANVAS_SIZE = 1000;
const BASE_PRICE_CENTS = 1; // $0.01 = 1 cent
const X402_VERSION = 1;

// Get x402 configuration from environment
const NETWORK = (process.env.X402_NETWORK ??
  "base-sepolia") as PaymentRequirements["network"];
const PAY_TO_ADDRESS =
  process.env.X402_PAY_TO_ADDRESS ??
  "0x0000000000000000000000000000000000000000";
const FACILITATOR_URL = (process.env.X402_FACILITATOR_URL ??
  "https://x402.org/facilitator") as `${string}://${string}`;

// USDC contract config per network (address + EIP-712 domain info)
const USDC_CONFIG: Record<string, { address: `0x${string}`; name: string; version: string }> = {
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
  "avalanche-fuji": {
    address: "0x5425890298aed601595a70AB815c96711a31Bc65",
    name: "USD Coin",
    version: "2",
  },
  avalanche: {
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    name: "USD Coin",
    version: "2",
  },
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
 * Price increases by $0.01 for each update
 */
function calculatePriceInAtomicUnits(updateCount: number): string {
  const priceInCents = BASE_PRICE_CENTS * (updateCount + 1);
  // USDC has 6 decimals, so $0.01 = 10000 atomic units
  const atomicUnits = priceInCents * 10000;
  return atomicUnits.toString();
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
  const usdcConfig = USDC_CONFIG[NETWORK];
  if (!usdcConfig) {
    throw new Error(`Unsupported network: ${NETWORK}`);
  }

  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: calculatePriceInAtomicUnits(updateCount),
    resource: requestUrl,
    description: `Paint pixel (${x}, ${y}) on 402 Dollar Homepage`,
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
 * Handle pixel painting with x402 payment flow
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
      .from(pixels)
      .where(and(eq(pixels.x, x), eq(pixels.y, y)));

    const currentUpdateCount = existingPixel?.updateCount ?? 0;
    const requestUrl = request.url;

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
      // Return 402 Payment Required with payment requirements
      return NextResponse.json(
        {
          x402Version: X402_VERSION,
          accepts: [paymentRequirements],
          error: "Payment required",
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

    // Verify and settle the payment using the facilitator
    console.log("[x402] === VERIFICATION DEBUG ===");
    console.log("[x402] Facilitator URL:", FACILITATOR_URL);
    console.log("[x402] Network:", NETWORK);
    console.log("[x402] USDC Asset:", paymentRequirements.asset);
    console.log("[x402] PayTo:", paymentRequirements.payTo);
    console.log("[x402] Amount:", paymentRequirements.maxAmountRequired);
    console.log("[x402] Payer (from):", paymentPayload.payload && "authorization" in paymentPayload.payload ? paymentPayload.payload.authorization.from : "unknown");
    console.log("[x402] Full payload:", JSON.stringify(paymentPayload, null, 2));
    console.log("[x402] Full requirements:", JSON.stringify(paymentRequirements, null, 2));

    const facilitator = useFacilitator({ url: FACILITATOR_URL });

    let verifyResult;
    try {
      verifyResult = await facilitator.verify(
        paymentPayload,
        paymentRequirements
      );
      console.log("[x402] Verify result:", JSON.stringify(verifyResult, null, 2));
    } catch (verifyError) {
      console.error("[x402] Facilitator verify threw:", verifyError);
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
        : "unknown"; // For SVM, we'd extract from transaction

    // Record the payment
    await db.insert(payments).values({
      pixelX: x,
      pixelY: y,
      owner: payerAddress,
      amount: Number(paymentRequirements.maxAmountRequired) / 10000 / 100, // Convert back to dollars
      nonce: settleResult.transaction ?? `${x}-${y}-${Date.now()}`,
      paymentHash: settleResult.transaction ?? "",
    });

    // Update or insert pixel
    const newPrice = (BASE_PRICE_CENTS * (currentUpdateCount + 2)) / 100;

    if (existingPixel) {
      await db
        .update(pixels)
        .set({
          color: color,
          owner: payerAddress,
          timestamp: new Date(),
          price: newPrice,
          updateCount: currentUpdateCount + 1,
        })
        .where(and(eq(pixels.x, x), eq(pixels.y, y)));
    } else {
      await db.insert(pixels).values({
        x: x,
        y: y,
        color: color,
        owner: payerAddress,
        timestamp: new Date(),
        price: newPrice,
        updateCount: 1,
      });
    }

    // Return success with settlement info
    return NextResponse.json(
      {
        success: true,
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
                })
              ).toString("base64")
            : "",
        },
      }
    );
  } catch (error) {
    console.error("Error in paint pixel:", error);
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
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const [pixel] = await db
    .select()
    .from(pixels)
    .where(and(eq(pixels.x, x), eq(pixels.y, y)));

  const updateCount = pixel?.updateCount ?? 0;
  const paymentRequirements = createPaymentRequirements(
    x,
    y,
    updateCount,
    request.url
  );

  return NextResponse.json({
    pixel: pixel ?? {
      x,
      y,
      color: "#1a1a2e",
      owner: null,
      price: BASE_PRICE_CENTS / 100,
      updateCount: 0,
    },
    paymentRequirements,
  });
}
