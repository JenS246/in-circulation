import { copyText } from '@/lib/format';
import type { Quote } from '@/lib/types';
import { QuoteActions } from './QuoteActions';

export function QuoteView({ quote, dateLabel, today = false }: { quote: Quote; dateLabel: string; today?: boolean }) {
  const creator = quote.speaker && quote.speaker !== quote.author ? quote.speaker : quote.author;
  return (
    <article className="daily-edition">
      <div className="edition-index" aria-label="Edition details">
        <span>{today ? 'Today' : 'Archive'}</span>
        <time dateTime={quote.publishedDate || quote.publishDate || ''}>{dateLabel}</time>
      </div>
      <figure className="quotation">
        <blockquote>{quote.quote}</blockquote>
        <figcaption>
          <strong>{creator}</strong>
          {quote.speaker && quote.speaker !== quote.author ? <span>Written by {quote.author}</span> : null}
          <span><cite>{quote.title}</cite>{quote.year ? `, ${quote.year}` : ''}</span>
        </figcaption>
      </figure>
      <footer className="source-note">
        <div className="source-copy">
          <p>{quote.sourceType}{quote.repository ? ` · ${quote.repository}` : ''}</p>
          {quote.sourceCitation ? <p>{quote.sourceCitation}</p> : null}
          {quote.showContext && quote.context ? <p className="public-context">{quote.context}</p> : null}
          <p className="rights">{quote.publicDomainStatus}{quote.rightsNote ? `. ${quote.rightsNote}` : ''}</p>
          <a className="source-link" href={quote.sourceUrl} rel="noreferrer" target="_blank">View original source</a>
        </div>
        <QuoteActions id={quote.id} text={copyText(quote)} author={creator} />
      </footer>
    </article>
  );
}
