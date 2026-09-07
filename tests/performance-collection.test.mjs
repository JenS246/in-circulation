import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateQuote } from '../backend/core.mjs';

const path = join(import.meta.dirname, '..', 'seed', 'curated-poems-songs-films.json');
const collection = JSON.parse(readFileSync(path, 'utf8'));

test('curated performance collection contains valid poems, songs, and films', () => {
  assert.equal(collection.quotes.length, 19);
  assert.deepEqual(new Set(collection.quotes.map((quote) => quote.sourceType)), new Set(['Poetry', 'Song', 'Film']));
  assert.equal(new Set(collection.quotes.map((quote) => quote.id)).size, collection.quotes.length);
  collection.quotes.forEach((quote) => assert.doesNotThrow(() => validateQuote(quote)));
});

test('curated performance collection remains editorially gated', () => {
  for (const quote of collection.quotes) {
    assert.equal(quote.status, 'draft', quote.id);
    assert.equal(quote.publishDate, null, quote.id);
    assert.equal(quote.reusable, false, quote.id);
    assert.equal(quote.showContext, false, quote.id);
    assert.ok(quote.sourceCitation, quote.id);
    assert.ok(quote.rightsNote, quote.id);
  }
});
