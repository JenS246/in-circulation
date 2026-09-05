import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QuoteView } from '@/components/QuoteView';
import { SiteHeader } from '@/components/SiteHeader';
import { displayDate } from '@/lib/date';
import { getPublicQuote } from '@/lib/db';
import { excerpt } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const quote = await getPublicQuote(id);
  if (!quote) return { title: 'Quotation not found | In Circulation' };
  const description = `${excerpt(quote.quote, 145)} - ${quote.speaker || quote.author}`;
  return {
    title: `${quote.speaker || quote.author} | In Circulation`, description,
    openGraph: { title: `In Circulation: ${quote.speaker || quote.author}`, description, type: 'article', images: [] },
    twitter: { card: 'summary', title: `In Circulation: ${quote.speaker || quote.author}`, description, images: [] },
  };
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getPublicQuote(id);
  if (!quote) notFound();
  return (
    <main className="edition-shell">
      <SiteHeader />
      <QuoteView quote={quote} dateLabel={displayDate(quote.publishedDate!)} />
      <footer className="site-footer"><a href="/archive">Return to the archive</a><Link href="/">Today’s quotation</Link></footer>
    </main>
  );
}
