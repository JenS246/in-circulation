import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return <main className="page-shell"><SiteHeader /><section className="empty-edition"><h1>Not in the archive</h1><p>This quotation is unavailable or has not been published.</p><a href="/archive">Browse the archive</a></section></main>;
}
