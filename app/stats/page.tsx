import { SiteHeader } from '@/components/SiteHeader';
import { statistics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  const stats = await statistics();
  const groups = [
    ['By century', stats.centuries], ['By source type', stats.genres],
    ['By repository', stats.repositories], ['By theme', stats.themes],
    ['By currency term', stats.currencyTerms],
  ] as const;
  return (
    <main className="page-shell">
      <SiteHeader />
      <header className="page-heading"><h1>Collection statistics</h1><p>{stats.total} quotations in the collection, including unpublished records.</p></header>
      <div className="stats-grid">{groups.map(([title, values]) => <section key={title}><h2>{title}</h2><dl>{values.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl></section>)}</div>
    </main>
  );
}
