import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io';
const siteDescription = 'An undergraduate building with Rust and C++. Articles and projects about decentralized exchanges, market making, distributed systems and small terminal tools.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'nicobecodin',
  description: siteDescription,
  alternates: { canonical: `${siteUrl}/` },
  icons: { icon: '/favicon.svg' },
  openGraph: { title: 'nicobecodin', description: siteDescription, type: 'website', url: siteUrl, images: [{ url: `${siteUrl}/og.png`, width: 1730, height: 909, alt: 'nicobecodin — Rust, DeFi and distributed systems' }] },
  twitter: { card: 'summary_large_image', title: 'nicobecodin', description: siteDescription, images: [`${siteUrl}/og.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
