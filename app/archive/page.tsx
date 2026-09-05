import { SiteHeader } from '@/components/SiteHeader';
import { archiveFacets, listArchive } from '@/lib/db';
import { displayDate } from '@/lib/date';
import { excerpt } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const value = (entry: string | string[] | undefined) => typeof entry === 'string' ? entry : '';

export default async function Archive({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filters = {
    search: value(params.search), author: value(params.author), sourceType: value(params.sourceType),
    theme: value(params.theme), currencyTerm: value(params.currencyTerm),
  };
  const [quotes, facets] = await Promise.all([listArchive(filters), archiveFacets()]);
  return (
    <main className="page-shell">
      <SiteHeader />
      <header className="page-heading">
        <h1>The archive</h1>
        <p>Every quotation remains attached to its source.</p>
      </header>
      <form className="archive-filters" role="search">
        <label className="wide-field">Search
          <input name="search" defaultValue={filters.search} type="search" placeholder="Quotation, author, or title" />
        </label>
        <label>Author
          <select name="author" defaultValue={filters.author}><option value="">All authors</option>{facets.authors.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label>Source type
          <select name="sourceType" defaultValue={filters.sourceType}><option value="">All types</option>{facets.sourceTypes.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label>Theme
          <select name="theme" defaultValue={filters.theme}><option value="">All themes</option>{facets.themes.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label>Currency term
          <select name="currencyTerm" defaultValue={filters.currencyTerm}><option value="">All terms</option>{facets.currencyTerms.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <button className="solid-button" type="submit">Apply</button>
        <a className="text-button" href="/archive">Clear</a>
      </form>
      <section className="archive-list" aria-live="polite">
        <h2 className="result-count">{quotes.length} {quotes.length === 1 ? 'entry' : 'entries'}</h2>
        {quotes.length ? quotes.map((quote) => (
          <article className="archive-entry" key={`${quote.id}-${quote.publishedDate}`}>
            <time dateTime={quote.publishedDate || ''}>{quote.publishedDate ? displayDate(quote.publishedDate) : 'Date unknown'}</time>
            <div>
              <a className="archive-quote" href={`/quotes/${quote.id}`}>{excerpt(quote.quote, 230)}</a>
              <p><strong>{quote.speaker || quote.author}</strong> <cite>{quote.title}</cite>{quote.year ? `, ${quote.year}` : ''}</p>
            </div>
            <span>{quote.sourceType}</span>
          </article>
        )) : <p className="empty-list">No published quotations match these filters.</p>}
      </section>
    </main>
  );
}
