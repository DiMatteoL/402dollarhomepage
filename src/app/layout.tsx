import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { Privy } from "~/lib/privy";
import { TRPCReactProvider } from "~/trpc/react";
import { Navigation } from "./_components/navigation";
import { PreventBrowserZoom } from "./_components/prevent-browser-zoom";
import { WelcomeModalProvider } from "./_components/welcome-modal";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://x402dollarhomepage.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "X402DollarHomepage | Own a Piece of Internet History",
    template: "%s | X402DollarHomepage",
  },
  description:
    "The modern successor to MillionDollarHomepage. Own a piece of internet history with blockchain-powered pixel ownership. Buy pixels for just $0.01 each. Advertise, create pixel art, or stake your claim on the digital canvas that never forgets.",
  keywords: [
    "X402DollarHomepage",
    "MillionDollarHomepage",
    "pixel advertising",
    "internet history",
    "blockchain pixels",
    "crypto advertising",
    "pixel art",
    "digital real estate",
    "web3 advertising",
    "pixel canvas",
    "buy pixels",
    "online advertising",
    "viral marketing",
    "homepage advertising",
    "pixel ownership",
  ],
  authors: [{ name: "X402DollarHomepage" }],
  creator: "X402DollarHomepage",
  publisher: "X402DollarHomepage",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", type: "image/png" }],
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "X402DollarHomepage",
    title: "X402DollarHomepage | Own a Piece of Internet History",
    description:
      "The modern successor to MillionDollarHomepage. Own a piece of internet history with blockchain-powered pixel ownership. Buy pixels for just $0.01 each. Stake your claim on the digital canvas that never forgets.",
    images: [
      {
        url: `${siteUrl}/x402hplarge.png`,
        secureUrl: `${siteUrl}/x402hplarge.png`,
        width: 1200,
        height: 630,
        alt: "X402DollarHomepage - The Modern Pixel Canvas",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@X402DollarHomepage",
    title: "X402DollarHomepage | Own a Piece of Internet History",
    description:
      "The modern successor to MillionDollarHomepage. Buy pixels for just $0.01 each. Blockchain-powered pixel ownership.",
    images: [
      {
        url: `${siteUrl}/x402hplarge.png`,
        alt: "X402DollarHomepage - The Modern Pixel Canvas",
      },
    ],
    creator: "@X402DollarHomepage",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "technology",
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
        {/* Hotjar Tracking Code for x402DollarHomepage */}
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:6601163,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
        <PreventBrowserZoom />
        <Privy>
          <TRPCReactProvider>
            <WelcomeModalProvider>
              <Navigation />
              <main>{children}</main>
            </WelcomeModalProvider>
          </TRPCReactProvider>
        </Privy>
      </body>
    </html>
  );
}
