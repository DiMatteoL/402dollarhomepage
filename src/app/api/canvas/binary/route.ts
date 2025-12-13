import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { pixels } from "~/server/db/schema";
import { encodeCanvas } from "~/lib/binary-canvas";

/**
 * GET /api/canvas/binary
 *
 * Returns the entire canvas as binary data for efficient transfer.
 * ~19x smaller than JSON format.
 *
 * Response: application/octet-stream
 * Format: See ~/lib/binary-canvas.ts for specification
 */
export async function GET() {
	try {
		// Fetch all pixels - fields needed for rendering and pricing
		const allPixels = await db
			.select({
				x: pixels.x,
				y: pixels.y,
				color: pixels.color,
				updateCount: pixels.updateCount,
			})
			.from(pixels);

    // Encode to binary format
    const buffer = encodeCanvas(allPixels);

    // Return as binary with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.byteLength.toString(),
        // Cache for 5 seconds - allows CDN caching while staying fresh
        "Cache-Control": "public, max-age=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error fetching binary canvas:", error);
    return NextResponse.json(
      { error: "Failed to fetch canvas data" },
      { status: 500 }
    );
  }
}
