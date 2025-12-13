import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for X402DollarHomepage - Read about our rules and guidelines for using the pixel canvas.",
};

export default function TermsOfServicePage() {
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
            Terms of{" "}
            <span className="text-[var(--color-accent-magenta)]">Service</span>
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Last updated: December 13, 2024
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using X402DollarHomepage (&quot;the
              Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our Service.
              We reserve the right to modify these terms at any time, and your
              continued use of the Service constitutes acceptance of any
              changes.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              2. Description of Service
            </h2>
            <p>
              X402DollarHomepage is a digital pixel canvas where users can
              purchase and color individual pixels using cryptocurrency (USDC on
              the Base network). Each pixel costs $0.01 USD equivalent and can
              be repainted by any user upon payment. The canvas serves as a
              permanent, blockchain-verified record of pixel ownership and
              artwork.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              3. Eligibility
            </h2>
            <p>
              You must be at least 18 years old to use this Service. By using
              the Service, you represent and warrant that you are of legal age
              to form a binding contract and meet all eligibility requirements.
              You must also have the legal right to use cryptocurrency in your
              jurisdiction.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              4. Pixel Purchases
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-cyan)]">
                  Pricing
                </h3>
                <p>
                  Each pixel costs $0.01 USD equivalent in USDC. Prices may be
                  adjusted in the future at our discretion. The price displayed
                  at the time of purchase is final.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-cyan)]">
                  Payment Method
                </h3>
                <p>
                  Payments are processed using USDC stablecoin on the Base
                  network via the x402 payment protocol. You are responsible for
                  any network transaction fees (gas) associated with your
                  purchase.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-cyan)]">
                  No Refunds
                </h3>
                <p className="font-medium text-[var(--color-accent-orange)]">
                  All pixel purchases are final and non-refundable. Blockchain
                  transactions cannot be reversed. Please ensure you select the
                  correct pixel and color before confirming your purchase.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-[var(--color-accent-cyan)]">
                  Pixel Ownership
                </h3>
                <p>
                  Purchasing a pixel grants you temporary display rights until
                  another user purchases that same pixel. There is no guarantee
                  of permanent ownership or display time. Any pixel can be
                  repainted by any other user at any time.
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              5. Prohibited Content
            </h2>
            <p className="mb-4">
              You agree not to use the Service to display or create:
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>
                Illegal content or content promoting illegal activities
              </li>
              <li>
                Hateful, discriminatory, or harassing content targeting any
                individual or group
              </li>
              <li>
                Pornographic, sexually explicit, or obscene material
              </li>
              <li>
                Content that infringes on intellectual property rights
              </li>
              <li>
                Malicious content including malware, phishing, or scams
              </li>
              <li>
                Personal information of others without consent
              </li>
              <li>
                Content that violates any applicable laws or regulations
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to remove or modify any content that violates
              these guidelines and to suspend or terminate access for repeat
              offenders.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              6. Wallet Security
            </h2>
            <p>
              You are solely responsible for maintaining the security of your
              cryptocurrency wallet and private keys. We are not responsible for
              any loss of funds due to compromised wallets, phishing attacks, or
              user error. Never share your private keys or seed phrases with
              anyone.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              7. Intellectual Property
            </h2>
            <div className="space-y-4">
              <p>
                The X402DollarHomepage platform, including its design, code, and
                branding, is owned by us and protected by intellectual property
                laws.
              </p>
              <p>
                By placing content on the canvas, you grant us a non-exclusive,
                worldwide, royalty-free license to display, reproduce, and
                distribute the pixel art created on our platform for promotional
                and operational purposes.
              </p>
              <p>
                You retain any intellectual property rights you may have in
                original artwork you create, but acknowledge that the canvas is
                a collaborative and ever-changing medium.
              </p>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              8. Disclaimers
            </h2>
            <div className="space-y-4">
              <p className="uppercase">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                IMPLIED.
              </p>
              <p>
                We do not guarantee that the Service will be uninterrupted,
                secure, or error-free. We are not responsible for any losses
                resulting from blockchain network issues, smart contract bugs,
                or technical failures.
              </p>
              <p>
                Cryptocurrency investments carry inherent risks. The value of
                USDC may fluctuate, and you assume all risks associated with
                cryptocurrency transactions.
              </p>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              9. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR
              GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
              LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR PIXEL PURCHASES
              IN THE TWELVE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless X402DollarHomepage, its
              operators, and affiliates from any claims, damages, losses, or
              expenses arising from your use of the Service, violation of these
              terms, or infringement of any third-party rights.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              11. Service Modifications
            </h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the
              Service at any time without notice. We may also impose limits on
              certain features or restrict access to parts of the Service
              without liability.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              12. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the jurisdiction in which we operate, without regard
              to conflict of law principles. Any disputes shall be resolved
              through binding arbitration in accordance with applicable rules.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              13. Severability
            </h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the
              remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)] text-xl">
              14. Contact
            </h2>
            <p>
              For questions about these Terms of Service, please contact us at:{" "}
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
            href="/privacy"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-cyan)]"
          >
            Privacy Policy
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
