"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * Hook to track online user presence using Supabase Realtime
 * @returns The current count of online users
 */
export function usePresence() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Create a unique ID for this browser tab
    const odid = crypto.randomUUID();

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: odid,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineCount;
}
