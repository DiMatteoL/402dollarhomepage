"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia, base } from "viem/chains";
import type { ReactNode } from "react";
import { env } from "~/env";

interface Props {
  children: ReactNode;
}

export function Privy({ children }: Props) {
  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00ffff",
        },
        loginMethods: ["email", "wallet", "google", "twitter"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        // Configure supported chains for x402 payments
        supportedChains: [baseSepolia, base],
        defaultChain: baseSepolia,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
