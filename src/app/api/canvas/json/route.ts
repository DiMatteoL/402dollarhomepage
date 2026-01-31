import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { pixels } from "~/server/db/schema";

/**
 * GET /api/canvas/json
 *
 * Returns the entire canvas as JSON for AI agents and programmatic access.
 * For efficient binary format, use /api/canvas/binary instead.
 *
 * Response includes:
 * - Canvas metadata (dimensions, default color)
 * - All painted pixels with their current state
 * - Statistics about canvas usage
 */
export async function GET() {
  try {
    // Fetch all painted pixels
    const allPixels = await db
      .select({
        x: pixels.x,
        y: pixels.y,
        color: pixels.color,
        owner: pixels.owner,
        price: pixels.price,
        updateCount: pixels.updateCount,
        timestamp: pixels.timestamp,
      })
      .from(pixels);

    // Build response
    const response = {
      canvas: {
        width: 1000,
        height: 1000,
        totalPixels: 1000000,
        defaultColor: "#1a1a2e",
      },
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
        unpaintedPixels: 1000000 - allPixels.length,
        percentagePainted: ((allPixels.length / 1000000) * 100).toFixed(4),
      },
      pricing: {
        basePrice: 0.01,
        priceIncrement: 0.01,
        maxClaims: 10,
        maxPrice: 0.1,
        currency: "USD",
        paymentMethod: "USDC on Base via x402 protocol",
      },
      api: {
        documentation: "/llms.txt",
        openapi: "/openapi.json",
        endpoints: {
          getCanvas: "GET /api/canvas/json",
          getCanvasBinary: "GET /api/canvas/binary",
          getPixel: "GET /api/pixel/paint?x={x}&y={y}",
          paintPixel: "POST /api/pixel/paint",
          paintBatch: "POST /api/pixel/paint-batch",
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 10 seconds - balance between freshness and performance
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error fetching JSON canvas:", error);
    return NextResponse.json(
      { error: "Failed to fetch canvas data" },
      { status: 500 }
    );
  }
}
