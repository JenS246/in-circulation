import type { Metadata } from 'next';
import { IBM_Plex_Mono, Libre_Baskerville, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const serif = Libre_Baskerville({ variable: '--font-serif', subsets: ['latin'], weight: ['400', '700'] });
const sans = Source_Sans_3({ variable: '--font-sans', subsets: ['latin'] });
const mono = IBM_Plex_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'In Circulation', template: '%s | In Circulation' },
  description: 'One carefully sourced quotation about money, each day.',
  openGraph: {
    title: 'In Circulation',
    description: 'One quotation about money, each day.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'In Circulation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'In Circulation',
    description: 'One quotation about money, each day.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
