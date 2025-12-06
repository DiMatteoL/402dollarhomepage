import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Supabase client for browser/client-side usage
 * Uses anon key for public access
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Debug: Log Supabase connection info
if (typeof window !== "undefined") {
  console.log("[Supabase] URL:", env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    "[Supabase] Anon key (first 20 chars):",
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + "..."
  );
}

/**
 * Database row type as returned by Supabase Realtime
 * Note: Drizzle preserves column names as camelCase in the database
 */
interface PixelDatabaseRow {
  x: number;
  y: number;
  color: string;
  owner: string;
  price: number;
  updateCount: number;
  timestamp: string;
}

/**
 * Application pixel type
 */
export interface RealtimePixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  price: number;
  updateCount: number;
}

/**
 * Subscribe to real-time pixel updates
 * @param onPixelUpdate - Callback function when a pixel is updated
 * @returns Unsubscribe function
 */
export function subscribeToPixelUpdates(
  onPixelUpdate: (pixel: RealtimePixel) => void
): () => void {
  console.log("[Supabase Realtime] Setting up subscription to xf_pixels...");

  const channel: RealtimeChannel = supabase
    .channel("xf_pixels_realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "xf_pixels",
      },
      (payload) => {
        console.log("[Supabase Realtime] INSERT received:", payload);
        const newData = payload.new as PixelDatabaseRow;
        if (newData && newData.x !== undefined && newData.y !== undefined) {
          onPixelUpdate({
            x: newData.x,
            y: newData.y,
            color: newData.color,
            owner: newData.owner,
            price: newData.price,
            updateCount: newData.updateCount,
          });
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "xf_pixels",
      },
      (payload) => {
        console.log("[Supabase Realtime] UPDATE received:", payload);
        const newData = payload.new as PixelDatabaseRow;
        if (newData && newData.x !== undefined && newData.y !== undefined) {
          onPixelUpdate({
            x: newData.x,
            y: newData.y,
            color: newData.color,
            owner: newData.owner,
            price: newData.price,
            updateCount: newData.updateCount,
          });
        }
      }
    )
    .subscribe((status, err) => {
      console.log("[Supabase Realtime] Subscription status:", status);
      if (err) {
        console.error("[Supabase Realtime] Subscription error:", err);
      }
      if (status === "SUBSCRIBED") {
        console.log(
          "[Supabase Realtime] ✓ Successfully subscribed to pixel updates"
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          "[Supabase Realtime] ✗ Channel error - check table permissions and realtime settings"
        );
      } else if (status === "TIMED_OUT") {
        console.warn("[Supabase Realtime] ✗ Subscription timed out");
      }
    });

  return () => {
    console.log("[Supabase Realtime] Unsubscribing from pixel updates");
    supabase.removeChannel(channel);
  };
}
