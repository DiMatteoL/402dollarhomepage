"use client";

import Link from "next/link";

export function Navigation() {
	return (
		<header className="sticky top-0 z-50 border-[var(--color-border)] border-b bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
				<Link className="flex items-center gap-3" href="/">
					<div className="relative">
						<div className="-inset-1 absolute rounded-lg bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-magenta)] opacity-30 blur" />
						<div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] font-bold font-mono text-[var(--color-accent-cyan)] text-sm">
							402
						</div>
					</div>
					<div className="hidden sm:block">
						<h1 className="font-bold text-lg tracking-tight">
							<span className="text-[var(--color-accent-cyan)]">$</span>Dollar
							<span className="text-[var(--color-text-muted)]">Homepage</span>
						</h1>
						<p className="text-[var(--color-text-muted)] text-xs">
							$0.01 per pixel
						</p>
					</div>
				</Link>

				<div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
					<span className="hidden sm:inline">Powered by</span>
					<span className="font-mono text-[var(--color-accent-magenta)]">
						x402
					</span>
				</div>
			</div>
		</header>
	);
}
