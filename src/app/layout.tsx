import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Navigation } from "./_components/navigation";

export const metadata: Metadata = {
	title: "402 Dollar Homepage | $0.01 Per Pixel",
	description:
		"Own a piece of internet history. Buy pixels for just $0.01 each on the 402 Dollar Homepage - a modern take on the Million Dollar Homepage.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
	openGraph: {
		title: "402 Dollar Homepage",
		description: "Own a piece of internet history. $0.01 per pixel.",
		type: "website",
	},
};

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={`${geistSans.variable} ${geistMono.variable}`}
			lang="en"
			suppressHydrationWarning
		>
			<body className="min-h-screen font-sans antialiased">
				<TRPCReactProvider>
					<div className="flex min-h-screen flex-col">
						<Navigation />
						<main className="flex-1">{children}</main>
						<footer className="border-[var(--color-border)] border-t bg-[var(--color-bg-secondary)] py-6">
							<div className="mx-auto max-w-7xl px-4 text-center">
								<p className="text-[var(--color-text-muted)] text-sm">
									<span className="glow-cyan text-[var(--color-accent-cyan)]">
										402
									</span>{" "}
									Dollar Homepage © {new Date().getFullYear()}
								</p>
								<p className="mt-2 text-[var(--color-text-muted)] text-xs">
									Powered by{" "}
									<span className="text-[var(--color-accent-magenta)]">
										x402
									</span>{" "}
									Protocol
								</p>
							</div>
						</footer>
					</div>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
