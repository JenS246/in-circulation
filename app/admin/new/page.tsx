import { QuoteForm } from '@/components/QuoteForm';
import { SiteHeader } from '@/components/SiteHeader';
import { requireEditor } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export default async function NewQuote() {
  await requireEditor('/admin/new');
  return <main className="page-shell admin-shell"><SiteHeader editor /><header className="editor-heading"><h1>Add a quotation</h1><p>The text and original source are first because fidelity comes first.</p></header><QuoteForm /></main>;
}
