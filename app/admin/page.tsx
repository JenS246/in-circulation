import { SiteHeader } from '@/components/SiteHeader';
import { DeleteQuoteButton } from '@/components/DeleteQuoteButton';
import { listAdmin } from '@/lib/db';
import { requireEditor } from '@/lib/admin';
import { RIGHTS_STATUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';
type Params = Record<string, string | string[] | undefined>;
const val = (entry: string | string[] | undefined) => typeof entry === 'string' ? entry : '';

export default async function Admin({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireEditor('/admin');
  const params = await searchParams;
  const filters = { search: val(params.search), status: val(params.status), rights: val(params.rights) };
  const quotes = await listAdmin(filters);
  const all = filters.search || filters.status || filters.rights ? await listAdmin() : quotes;
  const counts = {
    published: all.filter((quote) => quote.status === 'published').length,
    upcoming: all.filter((quote) => quote.status === 'scheduled' && quote.publishDate).length,
    queue: all.filter((quote) => quote.status === 'scheduled' && !quote.publishDate).length,
    review: all.filter((quote) => ['Needs Review', 'Do Not Publish'].includes(quote.publicDomainStatus)).length,
  };
  return (
    <main className="page-shell admin-shell">
      <SiteHeader editor />
      <header className="admin-heading">
        <div><h1>Quote editor</h1><p>Signed in as {user.email}</p></div>
        <a className="solid-button" href="/admin/new">Add quote</a>
      </header>
      <section className="admin-summary" aria-label="Collection summary">
        <p><strong>{counts.published}</strong> published</p><p><strong>{counts.upcoming}</strong> upcoming</p>
        <p><strong>{counts.queue}</strong> in queue</p><p><strong>{counts.review}</strong> rights holds</p>
      </section>
      <div className="admin-tools"><a href="/admin/import">Import and export</a><a href="/admin/settings">Settings</a><a href="/stats">Statistics</a></div>
      <form className="admin-filters" role="search">
        <label>Search <input type="search" name="search" defaultValue={filters.search} placeholder="Quotation, author, or title" /></label>
        <label>Status <select name="status" defaultValue={filters.status}><option value="">All statuses</option><option>draft</option><option>scheduled</option><option>published</option></select></label>
        <label>Rights <select name="rights" defaultValue={filters.rights}><option value="">All rights</option>{RIGHTS_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="solid-button" type="submit">Filter</button>
      </form>
      <section className="quote-table" aria-label="Quotes">
        <div className="quote-row quote-row-head"><span>Quotation</span><span>Publication</span><span>Rights</span><span>Actions</span></div>
        {quotes.map((quote) => (
          <article className="quote-row" key={quote.id}>
            <div><a href={`/admin/${quote.id}/edit`}><strong>{quote.author}</strong><span>{quote.quote.slice(0, 118)}{quote.quote.length > 118 ? '…' : ''}</span></a></div>
            <div><strong>{quote.status}</strong><span>{quote.publishDate || 'Unscheduled'}</span></div>
            <div><strong className={['Needs Review', 'Do Not Publish'].includes(quote.publicDomainStatus) ? 'hold' : ''}>{quote.publicDomainStatus}</strong><span>{quote.sourceType}</span></div>
            <div className="row-actions">
              <a href={`/admin/preview/${quote.id}`}>Preview</a>
              {!quote.publishDate && quote.status === 'scheduled' ? <>
                <form action="/api/admin/quotes" method="post"><input type="hidden" name="id" value={quote.id} /><button name="operation" value="up">Up</button></form>
                <form action="/api/admin/quotes" method="post"><input type="hidden" name="id" value={quote.id} /><button name="operation" value="down">Down</button></form>
              </> : null}
              <form action="/api/admin/quotes" method="post"><input type="hidden" name="id" value={quote.id} /><button name="operation" value="duplicate">Duplicate</button></form>
              <DeleteQuoteButton id={quote.id} />
            </div>
          </article>
        ))}
        {!quotes.length ? <p className="empty-list">No quotes match these filters.</p> : null}
      </section>
    </main>
  );
}
