import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for X402DollarHomepage - Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto pb-20">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-[var(--color-text-muted)] text-sm transition-colors hover:text-[var(--color-accent-cyan)]"
          >
            <span>←</span>
            <span>Back to Canvas</span>
          </Link>
          <h1 className="mb-4 font-bold text-4xl tracking-tight">
            Privacy{" "}
            <span className="text-[var(--color-accent-cyan)]">Policy</span>
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Last updated: December 13, 2024
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              1. Introduction
            </h2>
            <p>
              Welcome to X402DollarHomepage (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). We respect your privacy and are committed to
              protecting your personal data. This privacy policy explains how we
              collect, use, and safeguard your information when you use our
              pixel canvas service.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              2. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-magenta)]">
                  Wallet Information
                </h3>
                <p>
                  When you connect your cryptocurrency wallet, we collect your
                  public wallet address. This is necessary to process pixel
                  purchases and verify ownership. We do not have access to your
                  private keys or the ability to control your wallet.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-magenta)]">
                  Transaction Data
                </h3>
                <p>
                  We record pixel purchase transactions including: pixel
                  coordinates, colors selected, timestamps, wallet addresses,
                  and transaction amounts. This data is necessary to maintain
                  the canvas and verify pixel ownership.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-magenta)]">
                  Usage Data
                </h3>
                <p>
                  We automatically collect certain information when you visit
                  our site, including your IP address, browser type, device
                  information, pages visited, and time spent on the site. This
                  helps us improve our service.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-magenta)]">
                  Cookies
                </h3>
                <p>
                  We use essential cookies to enable core functionality like
                  wallet connections and session management. We may also use
                  analytics cookies to understand how visitors interact with our
                  site. You can control cookie preferences through your browser
                  settings.
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              3. How We Use Your Information
            </h2>
            <ul className="list-inside list-disc space-y-2">
              <li>To process and record pixel purchases on the canvas</li>
              <li>To display pixel ownership and attribution</li>
              <li>To prevent fraud and abuse of our service</li>
              <li>To improve and optimize our platform</li>
              <li>To communicate important service updates</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              4. Third-Party Services
            </h2>
            <div className="space-y-4">
              <p>We use the following third-party services:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <strong className="text-[var(--color-text-primary)]">
                    Privy
                  </strong>{" "}
                  - For wallet authentication and management
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">
                    Base Network (Coinbase)
                  </strong>{" "}
                  - For processing USDC payments
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">
                    Supabase
                  </strong>{" "}
                  - For database and real-time updates
                </li>
              </ul>
              <p>
                Each of these services has their own privacy policy governing
                their use of your data.
              </p>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              5. Data Retention
            </h2>
            <p>
              Pixel ownership data and transaction history are retained
              indefinitely as they form the permanent record of the canvas.
              Usage data and analytics are retained for up to 2 years. You may
              request deletion of non-essential personal data by contacting us.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              6. Your Rights
            </h2>
            <p className="mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (where applicable)</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              7. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational security
              measures to protect your personal data against unauthorized
              access, alteration, disclosure, or destruction. However, no method
              of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Our service is not intended for individuals under the age of 18.
              We do not knowingly collect personal information from children. If
              you believe we have collected data from a child, please contact us
              immediately.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              9. International Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              to protect your data in accordance with this privacy policy.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will
              notify you of any material changes by posting the new policy on
              this page with an updated revision date.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              11. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at:{" "}
              <a
                href="mailto:luca7dimatteo@gmail.com"
                className="text-[var(--color-accent-cyan)] hover:underline"
              >
                luca7dimatteo@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex gap-4 border-[var(--color-border)] border-t pt-8 text-sm">
          <Link
            href="/terms"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-cyan)]"
          >
            Terms of Service
          </Link>
          <span className="text-[var(--color-border)]">|</span>
          <Link
            href="/"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-cyan)]"
          >
            Back to Canvas
          </Link>
        </div>
      </div>
    </div>
  );
}
