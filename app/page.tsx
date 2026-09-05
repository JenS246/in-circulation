import { QuoteView } from '@/components/QuoteView';
import { SiteHeader } from '@/components/SiteHeader';
import { displayDate } from '@/lib/date';
import { getTodayQuote } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const edition = await getTodayQuote();
  return (
    <main id="main-content" className="edition-shell">
      <SiteHeader />
      {edition.quote ? (
        <QuoteView quote={edition.quote} dateLabel={displayDate(edition.date)} today />
      ) : (
        <section className="empty-edition">
          <p>No quotation is in circulation today.</p>
          <p>The editor has no eligible scheduled or unpublished records.</p>
        </section>
      )}
      <footer className="site-footer">
        <span>One quotation about money, each day.</span>
        <a href="/archive">Browse the archive</a>
      </footer>
    </main>
  );
}
