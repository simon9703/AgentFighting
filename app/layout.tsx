import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentFighting — AI Physics Brawl',
  description: 'One-shot AI controllers fighting inside a dynamic physics arena.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="product-nav" aria-label="Product navigation">
          <Link href="/">Live Arena</Link>
          <Link href="/tournament">Tournament Lab</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
