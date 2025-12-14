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
        loginMethods: ["wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        supportedChains: [base],
        defaultChain: base,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
