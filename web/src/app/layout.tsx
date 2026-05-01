import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes Archaeology",
  description:
    "Software history rendered as interface archaeology. The Hermes Agent examines its own codebase evolution and generates post-internet artifacts.",
};

function Nav() {
  return (
    <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-baseline gap-6 text-xs tracking-wide">
      <Link href="/" className="text-sm font-medium tracking-widest uppercase text-[var(--color-fg)]">
        Hermes Archaeology
      </Link>
      <Link href="/timeline" className="text-[var(--color-dim)] hover:text-[var(--color-fg)]">
        timeline
      </Link>
      <Link href="/skills" className="text-[var(--color-dim)] hover:text-[var(--color-fg)]">
        skills
      </Link>
      <Link href="/about" className="text-[var(--color-dim)] hover:text-[var(--color-fg)]">
        about
      </Link>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--color-border)] px-6 py-4 text-[10px] text-[var(--color-dim)] flex justify-between">
          <span>Hermes Archaeology — Built for the Nous Research Hermes Agent Creative Hackathon</span>
          <a
            href="https://github.com/NousResearch/hermes-agent"
            target="_blank"
            rel="noopener"
            className="hover:text-[var(--color-fg)]"
          >
            NousResearch/hermes-agent
          </a>
        </footer>
      </body>
    </html>
  );
}
