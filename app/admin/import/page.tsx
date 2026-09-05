import { SiteHeader } from '@/components/SiteHeader';
import { requireEditor } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export default async function ImportExport() {
  await requireEditor('/admin/import');
  return (
    <main className="page-shell admin-shell">
      <SiteHeader editor />
      <header className="editor-heading"><h1>Import and export</h1><p>Valid rows are kept. Errors are reported row by row.</p></header>
      <div className="transfer-grid">
        <section><h2>Import records</h2><form action="/api/admin/import" method="post" encType="multipart/form-data"><label>CSV or JSON file<input type="file" name="file" accept=".csv,.json,text/csv,application/json" required /></label><button className="solid-button" type="submit">Import file</button></form><a href="/sample-quotes.csv" download>Download sample CSV template</a></section>
        <section><h2>Export everything</h2><p>Exports include public, draft, scheduled, rights, and internal fields.</p><p><a className="solid-button" href="/api/admin/export/csv">Export CSV</a></p><p><a className="text-button" href="/api/admin/export/json">Export JSON</a></p></section>
      </div>
    </main>
  );
}
