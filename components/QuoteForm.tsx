import type { Quote } from '@/lib/types';
import { QUOTE_STATUSES, RIGHTS_STATUSES, SOURCE_TYPES } from '@/lib/types';

export function QuoteForm({ quote }: { quote?: Quote }) {
  return (
    <form className="quote-form" action="/api/admin/quotes" method="post">
      {quote ? <input type="hidden" name="id" value={quote.id} /> : null}
      <input type="hidden" name="queuePosition" value={quote?.queuePosition || 0} />
      <section className="form-primary">
        <label>Quotation text <span>Required. Stored exactly as entered.</span>
          <textarea name="quote" required rows={12} defaultValue={quote?.quote || ''} autoFocus />
        </label>
        <label>Original source URL <span>Required.</span>
          <input name="sourceUrl" required type="url" defaultValue={quote?.sourceUrl || ''} />
        </label>
      </section>
      <section className="form-grid">
        <label>Author <input name="author" required defaultValue={quote?.author || ''} /></label>
        <label>Speaker, if different <input name="speaker" defaultValue={quote?.speaker || ''} /></label>
        <label className="span-two">Work or document title <input name="title" required defaultValue={quote?.title || ''} /></label>
        <label>Year <input name="year" inputMode="numeric" defaultValue={quote?.year || ''} /></label>
        <label>Full publication date <input name="publicationDate" defaultValue={quote?.publicationDate || ''} placeholder="As known or YYYY-MM-DD" /></label>
        <label>Source type <select name="sourceType" defaultValue={quote?.sourceType || 'Other'}>{SOURCE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Repository <input name="repository" defaultValue={quote?.repository || ''} /></label>
        <label className="span-two">Citation, page, chapter, or stanza <input name="sourceCitation" defaultValue={quote?.sourceCitation || ''} /></label>
        <label>Currency terms <span>Comma separated.</span><input name="currencyTerms" defaultValue={quote?.currencyTerms.join(', ') || ''} /></label>
        <label>Themes <span>Comma separated.</span><input name="themes" defaultValue={quote?.themes.join(', ') || ''} /></label>
        <label className="span-two">Internal context <span>Private unless “Show context publicly” is checked.</span><textarea name="context" rows={4} defaultValue={quote?.context || ''} /></label>
        <label className="check-field"><input type="checkbox" name="showContext" defaultChecked={quote?.showContext} /> Show context publicly</label>
      </section>
      <section className="rights-panel">
        <h2>Rights and publication</h2>
        <div className="form-grid">
          <label>Rights status <select name="publicDomainStatus" defaultValue={quote?.publicDomainStatus || 'Needs Review'}>{RIGHTS_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Workflow status <select name="status" defaultValue={quote?.status || 'draft'}>{QUOTE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Publish date <span>YYYY-MM-DD</span><input type="date" name="publishDate" defaultValue={quote?.publishDate || ''} /></label>
          <label className="check-field"><input type="checkbox" name="reusable" defaultChecked={quote?.reusable} /> May automatically repeat</label>
          <label className="span-two">Rights note <textarea name="rightsNote" rows={3} defaultValue={quote?.rightsNote || ''} /></label>
          <label className="span-two">Internal notes <textarea name="notes" rows={3} defaultValue={quote?.notes || ''} /></label>
        </div>
        <p className="rights-warning">Needs Review and Do Not Publish records are blocked from automatic publication, even when scheduled.</p>
      </section>
      <div className="form-actions">
        <button className="solid-button" type="submit" name="operation" value="save">Save quote</button>
        {quote ? <a className="text-button" href={`/admin/preview/${quote.id}`}>Preview</a> : null}
        <a className="text-button" href="/admin">Cancel</a>
      </div>
    </form>
  );
}
