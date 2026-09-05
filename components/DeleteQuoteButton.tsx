'use client';

export function DeleteQuoteButton({ id }: { id: string }) {
  return <form action="/api/admin/quotes" method="post" onSubmit={(event) => { if (!window.confirm('Delete this quote and its publication history?')) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="danger-link" name="operation" value="delete">Delete</button></form>;
}
