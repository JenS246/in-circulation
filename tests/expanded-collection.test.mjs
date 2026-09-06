import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateQuote } from '../backend/core.mjs';

const root = join(import.meta.dirname, '..');
const founding = JSON.parse(readFileSync(join(root, 'seed', 'curated-quotes.json'), 'utf8'));
const expanded = JSON.parse(readFileSync(join(root, 'seed', 'expanded-quotes.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(root, 'seed', 'public-domain-sources.json'), 'utf8'));
const ebookByTitle = new Map(catalog.sources.map((source) => [source.title, source.ebook]));

test('expanded corpus supplies 500 unique valid drafts', () => {
  assert.equal(expanded.quotes.length, 500);
  assert.equal(new Set(expanded.quotes.map(({ id }) => id)).size, 500);
  expanded.quotes.forEach((quote) => assert.doesNotThrow(() => validateQuote(quote), quote.id));
});

test('bulk candidates cannot enter the publication queue without review', () => {
  for (const quote of expanded.quotes) {
    assert.equal(quote.status, 'draft', quote.id);
    assert.equal(quote.publishDate, null, quote.id);
    assert.equal(quote.reusable, false, quote.id);
    assert.equal(quote.showContext, false, quote.id);
    assert.match(quote.notes, /Requires editorial review before scheduling\./, quote.id);
  }
});

test('source identities and deterministic record ids remain intact', () => {
  const foundingText = new Set(founding.quotes.map(({ quote }) => quote.replace(/\s+/g, ' ').trim().toLowerCase()));
  for (const quote of expanded.quotes) {
    const ebook = ebookByTitle.get(quote.title);
    assert.ok(ebook, `Missing source catalog entry for ${quote.title}`);
    assert.equal(quote.repository, 'Project Gutenberg', quote.id);
    assert.equal(quote.sourceUrl, `https://www.gutenberg.org/cache/epub/${ebook}/pg${ebook}.txt`, quote.id);
    assert.equal(quote.sourceCitation, `Project Gutenberg eBook #${ebook}; exact-text search within the linked plain-text edition`, quote.id);
    const digest = createHash('sha1').update(`${ebook}:${quote.quote}`).digest('hex').slice(0, 14);
    assert.equal(quote.id, `gutenberg-${ebook}-${digest}`);
    assert.equal(foundingText.has(quote.quote.replace(/\s+/g, ' ').trim().toLowerCase()), false, quote.id);
  }
});
