import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateQuote } from '../backend/core.mjs';

const collectionPath = join(import.meta.dirname, '..', 'seed', 'curated-quotes.json');
const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));

test('founding collection has 30 unique, valid records', () => {
  assert.equal(collection.quotes.length, 30);
  assert.equal(new Set(collection.quotes.map(({ id }) => id)).size, 30);
  collection.quotes.forEach((quote) => assert.doesNotThrow(() => validateQuote(quote)));
});

test('rights safeguards keep review records out of the schedule', () => {
  for (const quote of collection.quotes) {
    if (['Needs Review', 'Do Not Publish'].includes(quote.publicDomainStatus)) {
      assert.equal(quote.status, 'draft', `${quote.id} must remain a draft`);
      assert.equal(quote.publishDate, null, `${quote.id} must not have a publication date`);
    }
  }
});

test('source integrity fields are present on every record', () => {
  for (const quote of collection.quotes) {
    assert.match(quote.sourceUrl, /^https:\/\//, quote.id);
    assert.ok(quote.sourceCitation, quote.id);
    assert.ok(quote.rightsNote, quote.id);
    assert.ok(Array.isArray(quote.currencyTerms) && quote.currencyTerms.length, quote.id);
    assert.ok(Array.isArray(quote.themes) && quote.themes.length, quote.id);
    assert.equal(quote.showContext, false, `${quote.id} context should remain private`);
  }
});
