import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { sepoliaPixels } from "~/server/db/schema";

/**
 * GET /api/sepolia/canvas/json
 *
 * Returns the sepolia testnet canvas (100x100) as JSON.
 * This is a testnet that resets daily.
 */
export async function GET() {
  try {
    // Fetch all painted pixels
    const allPixels = await db
      .select({
        x: sepoliaPixels.x,
        y: sepoliaPixels.y,
        color: sepoliaPixels.color,
        owner: sepoliaPixels.owner,
        price: sepoliaPixels.price,
        updateCount: sepoliaPixels.updateCount,
        timestamp: sepoliaPixels.timestamp,
      })
      .from(sepoliaPixels);

    // Build response
    const response = {
      canvas: {
        width: 100,
        height: 100,
        totalPixels: 10000,
        defaultColor: "#1a1a2e",
      },
      network: "base-sepolia",
      testnet: true,
      resetsDaily: true,
      pixels: allPixels.map((p) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        owner: p.owner,
        price: p.price,
        updateCount: p.updateCount,
        lastUpdated: p.timestamp?.toISOString() ?? null,
      })),
      stats: {
        paintedPixels: allPixels.length,
        unpaintedPixels: 10000 - allPixels.length,
        percentagePainted: ((allPixels.length / 10000) * 100).toFixed(2),
      },
      pricing: {
        basePrice: 0.01,
        priceIncrement: 0.01,
        maxClaims: 10,
        maxPrice: 0.1,
        currency: "USD",
        paymentMethod: "USDC on Base Sepolia via x402 protocol (testnet)",
      },
      api: {
        documentation: "/llms.txt",
        endpoints: {
          getCanvas: "GET /api/sepolia/canvas/json",
          getCanvasBinary: "GET /api/sepolia/canvas/binary",
          getPixel: "GET /api/sepolia/pixel/paint?x={x}&y={y}",
          paintPixel: "POST /api/sepolia/pixel/paint",
          paintBatch: "POST /api/sepolia/pixel/paint-batch",
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error fetching sepolia JSON canvas:", error);
    return NextResponse.json(
      { error: "Failed to fetch canvas data" },
      { status: 500 }
    );
  }
}
