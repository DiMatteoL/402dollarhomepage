import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";

/**
 * POST /api/cron/reset-sepolia
 *
 * Resets the sepolia testnet canvas by truncating all pixel and payment data.
 * Called daily by Vercel cron job.
 *
 * Security: Requires CRON_SECRET header to match env variable.
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Truncate sepolia tables
    await db.execute(sql`TRUNCATE TABLE xf_sepolia_pixels`);
    await db.execute(sql`TRUNCATE TABLE xf_sepolia_payments RESTART IDENTITY`);

    console.log("[cron] Sepolia canvas reset successfully at", new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: "Sepolia canvas reset successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] Error resetting sepolia canvas:", error);
    return NextResponse.json(
      { error: "Failed to reset sepolia canvas" },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing (with auth)
export async function GET(request: Request) {
  return POST(request);
}
