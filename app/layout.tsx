import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentFighting — AI Physics Brawl',
  description: 'One-shot AI controllers fighting inside a dynamic physics arena.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
