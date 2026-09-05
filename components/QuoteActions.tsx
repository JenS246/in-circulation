'use client';

import { useEffect, useState } from 'react';

export function QuoteActions({ id, text, author }: { id: string; text: string; author: string }) {
  const [message, setMessage] = useState('');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const readFavorite = () => setFavorite(JSON.parse(localStorage.getItem('in-circulation-favorites') || '[]').includes(id));
    const timer = window.setTimeout(readFavorite, 0);
    window.addEventListener('storage', readFavorite);
    return () => { window.clearTimeout(timer); window.removeEventListener('storage', readFavorite); };
  }, [id]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setMessage('Copied');
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: `In Circulation: ${author}`, text, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); setMessage('Link copied'); }
  }

  function toggleFavorite() {
    const items: string[] = JSON.parse(localStorage.getItem('in-circulation-favorites') || '[]');
    const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    localStorage.setItem('in-circulation-favorites', JSON.stringify(next));
    setFavorite(next.includes(id));
  }

  return (
    <div className="edition-actions" aria-label="Quote actions">
      <button type="button" onClick={copy}>Copy quote</button>
      <button type="button" onClick={share}>Share</button>
      <button type="button" onClick={toggleFavorite}>{favorite ? 'Saved' : 'Save'}</button>
      <span className="action-message" aria-live="polite">{message}</span>
    </div>
  );
}
