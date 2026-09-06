import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, parseCsv, validateQuote } from '../backend/core.mjs';

const valid = {
  quote: 'A line, exactly.\nA second line.',
  author: 'Placeholder author',
  title: 'Placeholder work',
  sourceType: 'Poetry',
  sourceUrl: 'https://example.com/source',
  publicDomainStatus: 'Needs Review',
  status: 'draft',
};

test('quotation text and line breaks are preserved', () => {
  assert.equal(validateQuote(valid).quote, valid.quote);
});

test('rights and dates are validated', () => {
  assert.throws(() => validateQuote({...valid, publicDomainStatus: 'Probably fine'}), /Rights status/);
  assert.throws(() => validateQuote({...valid, publishDate: '09-05-2026'}), /YYYY-MM-DD/);
  assert.throws(() => validateQuote({...valid, sourceUrl: 'javascript:alert(1)'}), /HTTP or HTTPS/);
});

test('CSV parser preserves commas, quotes, and newlines', () => {
  const rows = parseCsv('quote,author\r\n"One, two\n""three""",Writer\r\n');
  assert.deepEqual(rows, [{quote:'One, two\n"three"', author:'Writer'}]);
});

test('timezone conversion uses the configured local date', () => {
  assert.equal(localDate('America/New_York', new Date('2026-01-01T02:00:00Z')), '2025-12-31');
});
