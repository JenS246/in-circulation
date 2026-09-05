import { notFound } from 'next/navigation';
import { QuoteView } from '@/components/QuoteView';
import { SiteHeader } from '@/components/SiteHeader';
import { displayDate } from '@/lib/date';
import { requireEditor } from '@/lib/admin';
import { getQuote } from '@/lib/db';

export const dynamic = 'force-dynamic';
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEditor(`/admin/preview/${id}`);
  const quote = await getQuote(id);
  if (!quote) notFound();
  return <main className="edition-shell preview-shell"><SiteHeader editor /><div className="preview-notice">Private preview. {quote.publicDomainStatus}.</div><QuoteView quote={quote} dateLabel={quote.publishDate ? displayDate(quote.publishDate) : 'Unscheduled'} /><footer className="site-footer"><a href={`/admin/${quote.id}/edit`}>Return to editor</a></footer></main>;
}
