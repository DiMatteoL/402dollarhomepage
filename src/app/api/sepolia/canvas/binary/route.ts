import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { sepoliaPixels } from "~/server/db/schema";
import { encodeCanvas } from "~/lib/binary-canvas";

/**
 * GET /api/sepolia/canvas/binary
 *
 * Returns the sepolia testnet canvas (100x100) as binary data.
 * Format: See ~/lib/binary-canvas.ts for specification
 */
export async function GET() {
  try {
    // Fetch all sepolia pixels
    const allPixels = await db
      .select({
        x: sepoliaPixels.x,
        y: sepoliaPixels.y,
        color: sepoliaPixels.color,
        updateCount: sepoliaPixels.updateCount,
      })
      .from(sepoliaPixels);

    // Encode to binary format
    const buffer = encodeCanvas(allPixels);

    // Return as binary with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.byteLength.toString(),
        // Cache for 5 seconds
        "Cache-Control": "public, max-age=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error fetching sepolia binary canvas:", error);
    return NextResponse.json(
      { error: "Failed to fetch canvas data" },
      { status: 500 }
    );
  }
}
