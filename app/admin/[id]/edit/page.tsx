import { notFound } from 'next/navigation';
import { QuoteForm } from '@/components/QuoteForm';
import { SiteHeader } from '@/components/SiteHeader';
import { requireEditor } from '@/lib/admin';
import { getQuote } from '@/lib/db';

export const dynamic = 'force-dynamic';
export default async function EditQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEditor(`/admin/${id}/edit`);
  const quote = await getQuote(id);
  if (!quote) notFound();
  return <main className="page-shell admin-shell"><SiteHeader editor /><header className="editor-heading"><h1>Edit quotation</h1><p>Changes are saved exactly as entered.</p></header><QuoteForm quote={quote} /></main>;
}
