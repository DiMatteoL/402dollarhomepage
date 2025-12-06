import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Navigation } from "./_components/navigation";
import { PreventBrowserZoom } from "./_components/prevent-browser-zoom";

export const metadata: Metadata = {
	title: "402 Dollar Homepage | $0.01 Per Pixel",
	description:
		"Own a piece of internet history. Buy pixels for just $0.01 each on the 402 Dollar Homepage.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
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
			<body className="min-h-screen overflow-hidden font-sans antialiased">
				<PreventBrowserZoom />
				<TRPCReactProvider>
					<Navigation />
					<main>{children}</main>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
