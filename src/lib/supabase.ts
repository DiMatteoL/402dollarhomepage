import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Supabase client for browser/client-side usage
 * Uses anon key for public access
 */
export const supabase = createClient(
	env.NEXT_PUBLIC_SUPABASE_URL,
	env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Subscribe to real-time pixel updates
 * @param onPixelUpdate - Callback function when a pixel is updated
 * @returns Unsubscribe function
 */
export function subscribeToPixelUpdates(
	onPixelUpdate: (pixel: {
		x: number;
		y: number;
		color: string;
		owner: string;
		price: number;
		updateCount: number;
	}) => void,
) {
	const channel = supabase
		.channel("xf_pixels")
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "xf_pixels",
			},
			(payload) => {
				const newData = payload.new as {
					x: number;
					y: number;
					color: string;
					owner: string;
					price: number;
					updateCount: number;
				};
				if (newData) {
					onPixelUpdate(newData);
				}
			},
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}
