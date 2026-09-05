import Link from 'next/link';

export function SiteHeader({ editor = false }: { editor?: boolean }) {
  return (
    <header className="masthead">
        <Link className="wordmark" href="/" aria-label="In Circulation home">In Circulation</Link>
      <nav aria-label="Primary navigation">
        <a href="/archive">Archive</a>
        <a href="/stats">Statistics</a>
        <a href="/admin">{editor ? 'Quotes' : 'Editor'}</a>
      </nav>
    </header>
  );
}
