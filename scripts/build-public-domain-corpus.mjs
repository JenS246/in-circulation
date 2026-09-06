import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuote } from '../backend/core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(join(root, 'seed', 'public-domain-sources.json'), 'utf8'));
const founding = JSON.parse(await readFile(join(root, 'seed', 'curated-quotes.json'), 'utf8'));
const outputPath = join(root, 'seed', 'expanded-quotes.json');
const cacheDirectory = join(root, 'work', 'gutenberg');
const targetNewRecords = Number(process.argv[2] || 500);

const termPatterns = [
  ['money', /\bmone(?:y|ys|yed)\b/i], ['coin', /\bcoins?\b/i], ['currency', /\bcurrenc(?:y|ies)\b/i],
  ['dollar', /\bdollars?\b/i], ['cent', /\bcents?\b/i], ['penny', /\bpenn(?:y|ies)\b/i],
  ['pound', /\bpounds?\b/i], ['shilling', /\bshillings?\b/i], ['guinea', /\bguineas?\b/i],
  ['franc', /\bfrancs?\b/i], ['sovereign', /\bsovereigns?\b/i], ['gold', /\bgold\b/i],
  ['silver', /\bsilver\b/i], ['cash', /\bcash\b/i], ['wage', /\bwages?\b/i],
  ['salary', /\bsalar(?:y|ies)\b/i], ['pay', /\b(?:pay|pays|paid|payment|payments)\b/i],
  ['debt', /\bdebts?\b/i], ['credit', /\bcredit\b/i], ['loan', /\bloans?\b/i],
  ['borrow', /\b(?:borrow|borrows|borrowed|borrowing|borrower|borrowers)\b/i],
  ['lend', /\b(?:lend|lends|lent|lender|lenders|lending)\b/i], ['rent', /\brents?\b/i],
  ['price', /\bprices?\b/i], ['cost', /\b(?:cost|costs|costly)\b/i], ['income', /\bincome\b/i],
  ['fortune', /\bfortunes?\b/i], ['wealth', /\bwealth(?:y)?\b/i], ['poor', /\bpoor(?:er|est)?\b/i],
  ['rich', /\brich(?:er|est)?\b/i], ['poverty', /\bpoverty\b/i], ['capital', /\bcapital\b/i],
  ['interest', /\binterest\b/i], ['bank', /\bbanks?\b/i], ['bill', /\bbills?\b/i],
  ['account', /\baccounts?\b/i], ['earnings', /\bearn(?:s|ed|ing|ings)?\b/i],
  ['value', /\bvalu(?:e|es|ed|able|ation)\b/i], ['worth', /\bworth\b/i],
  ['buy', /\b(?:buy|buys|buying|bought)\b/i], ['sell', /\b(?:sell|sells|selling|sold)\b/i],
  ['spend', /\b(?:spend|spends|spent|spending)\b/i], ['save', /\b(?:save|saves|saved|saving|savings)\b/i],
  ['property', /\bproperty\b/i], ['inheritance', /\binherit(?:ance|ed|s|ing)?\b/i]
];

const boilerplate = /project gutenberg|gutenberg-tm|ebook|www\.|https?:|copyright|table of contents|transcriber|produced by|release date/i;
const ambiguousOnly = new Set([
  'poor', 'rich', 'gold', 'silver', 'fortune', 'worth', 'interest', 'bill', 'account',
  'capital', 'credit', 'value', 'cost', 'pay', 'spend', 'save',
]);
const verbs = /\b(?:is|are|was|were|be|been|being|have|has|had|do|does|did|make|made|give|gave|take|took|pay|paid|earn|earned|buy|bought|sell|sold|spend|spent|owe|owed|cost|save|saved|want|wanted|need|needed|live|lived|work|worked|keep|kept|lose|lost|get|got)\b/i;
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

function bodyOf(text) {
  const start = text.search(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  const end = text.search(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  return text.slice(start >= 0 ? text.indexOf('\n', start) + 1 : 0, end > 0 ? end : text.length);
}

function termsFor(text) {
  return termPatterns.filter(([, pattern]) => pattern.test(text)).map(([term]) => term);
}

function themesFor(terms) {
  const themes = new Set();
  for (const term of terms) {
    if (['wage', 'salary', 'earnings', 'pay'].includes(term)) themes.add('wages');
    if (['debt', 'credit', 'loan', 'borrow', 'lend', 'interest'].includes(term)) themes.add('debt');
    if (['price', 'cost', 'value', 'worth'].includes(term)) themes.add('value');
    if (['buy', 'sell'].includes(term)) themes.add('exchange');
    if (['spend'].includes(term)) themes.add('spending');
    if (['save'].includes(term)) themes.add('saving');
    if (['poor', 'poverty'].includes(term)) themes.add('poverty');
    if (['rich', 'wealth', 'fortune', 'inheritance', 'property', 'capital'].includes(term)) themes.add('wealth');
    if (['currency', 'coin', 'dollar', 'cent', 'penny', 'pound', 'shilling', 'guinea', 'franc', 'sovereign', 'gold', 'silver', 'cash', 'money', 'bank', 'bill', 'account'].includes(term)) themes.add('money');
  }
  return [...themes].slice(0, 5);
}

function candidatesFrom(text) {
  const paragraphs = bodyOf(text).replace(/\r/g, '').split(/\n\s*\n/);
  const candidates = [];
  for (const original of paragraphs) {
    const paragraph = original.replace(/\n(?=\S)/g, ' ').trim();
    if (paragraph.length < 35 || paragraph.length > 2200 || boilerplate.test(paragraph)) continue;
    if (/^(?:chapter|book|volume|part)\b/i.test(paragraph) || /^[^a-z]{12,}$/.test(paragraph)) continue;
    for (const { segment } of segmenter.segment(paragraph)) {
      const quote = segment.trim();
      const words = quote.match(/[\p{L}\p{N}’'-]+/gu) || [];
      if (words.length < 8 || words.length > 42 || quote.length > 360 || !verbs.test(quote)) continue;
      if (!/^[^\p{L}]*\p{Lu}/u.test(quote)) continue;
      if (!/[.!?][”’"')\]]?$/.test(quote) || /[_{}<>]|\b(?:fig|vol|ibid|p\.\s*\d+)\b/i.test(quote)) continue;
      const terms = termsFor(quote);
      if (!terms.length || terms.every((term) => ambiguousOnly.has(term))) continue;
      if (/\b(?:Mr|Mrs|Ms|Dr|St|viz|etc)\.$/.test(quote)) continue;
      if (/\b(?:pay|paid|paying)\s+(?:a\s+)?(?:visit|attention|respect|respects|tribute|compliment|court)\b/i.test(quote)) continue;
      if (/\b(?:spend|spends|spent|spending)\b.{0,25}\b(?:hour|hours|time|day|days|evening|night|afternoon|leisure)\b/i.test(quote)
          && terms.every((term) => ['spend', 'save', 'poor', 'rich', 'fortune', 'value', 'worth', 'gold', 'silver'].includes(term))) continue;
      if (/\b(?:save|saves|saved|saving)\b.{0,25}\b(?:life|lives|time|trouble|anybody|someone|expense)\b/i.test(quote)
          && terms.every((term) => ['save', 'poor', 'rich', 'fortune', 'value', 'worth'].includes(term))) continue;
      if (/\bpaid?\s+(?:no|little|much)\s+credit\b/i.test(quote)) continue;
      if (terms.length === 1 && terms[0] === 'value' && /\bvaluable\b/i.test(quote)) continue;
      if (terms.every((term) => ['value', 'save'].includes(term)) && /\bvaluable\b/i.test(quote)) continue;
      if (terms.length === 1 && terms[0] === 'poor' && /\bpoor\s+(?:fellow|boy|girl|child|man|woman|creature|dear)\b/i.test(quote)) continue;
      if (terms.length === 1 && terms[0] === 'cost' && /\bat\s+(?:all|any)\s+costs?\b/i.test(quote)) continue;
      if (terms.length === 1 && terms[0] === 'earnings' && /\bearn(?:s|ed|ing)?\s+(?:honou?r|respect|reputation|praise|glory)\b/i.test(quote)) continue;
      if (terms.length === 1 && terms[0] === 'pound' && /\bpound(?:s)?\s+(?:weight|of\s+(?:flesh|meat|wool|tea|bread))\b/i.test(quote)) continue;
      if (quote.split(/\d/).length > 7 || (quote.match(/[A-Z]/g) || []).length > quote.length * 0.35) continue;
      const strongTerms = terms.filter((term) => !ambiguousOnly.has(term)).length;
      const score = strongTerms * 8 + terms.length * 3 - Math.abs(words.length - 22) / 5;
      candidates.push({ quote, terms, score });
    }
  }
  return candidates;
}

function stableId(source, quote) {
  const digest = createHash('sha1').update(`${source.ebook}:${quote}`).digest('hex').slice(0, 14);
  return `gutenberg-${source.ebook}-${digest}`;
}

await mkdir(cacheDirectory, { recursive: true });
const existingText = new Set(founding.quotes.map(({ quote }) => quote.replace(/\s+/g, ' ').trim().toLowerCase()));
const selected = [];
const perSourceLimit = Math.max(8, Math.ceil(targetNewRecords / catalog.sources.length) + 3);

for (const source of catalog.sources) {
  const textUrl = `https://www.gutenberg.org/cache/epub/${source.ebook}/pg${source.ebook}.txt`;
  const cachePath = join(cacheDirectory, `${source.ebook}.txt`);
  let text;
  try { text = await readFile(cachePath, 'utf8'); }
  catch {
    const response = await fetch(textUrl, { headers: { 'user-agent': 'In-Circulation-Curator/1.0' } });
    if (!response.ok) { console.error(`Skip ${source.ebook}: HTTP ${response.status}`); continue; }
    text = await response.text();
    await writeFile(cachePath, text);
  }
  const seenForSource = new Set();
  const candidates = candidatesFrom(text).sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    const normalized = candidate.quote.replace(/\s+/g, ' ').trim().toLowerCase();
    if (existingText.has(normalized) || seenForSource.has(normalized)) continue;
    seenForSource.add(normalized);
    existingText.add(normalized);
    selected.push({
      id: stableId(source, candidate.quote), quote: candidate.quote, author: source.author, speaker: null,
      title: source.title, year: String(source.year), publicationDate: String(source.year), sourceType: source.sourceType,
      currencyTerms: candidate.terms, themes: themesFor(candidate.terms),
      context: `Candidate passage selected because it directly invokes ${candidate.terms.join(', ')}.`, showContext: false,
      repository: 'Project Gutenberg', sourceUrl: textUrl,
      sourceCitation: `Project Gutenberg eBook #${source.ebook}; exact-text search within the linked plain-text edition`,
      publicDomainStatus: 'Verified Public Domain',
      rightsNote: `First published in ${source.year}; ${source.author} died in ${source.authorDeath}. Public domain in the United States; repository presence was not used as the sole rights basis.`,
      publishDate: null, status: 'draft', reusable: false,
      notes: 'Mechanically extracted exact sentence from the linked edition; prose line wrapping normalized only. Requires editorial review before scheduling.',
      queuePosition: 1000 + selected.length,
    });
    if ([...seenForSource].length >= perSourceLimit || selected.length >= targetNewRecords) break;
  }
  console.log(`${source.ebook} ${source.title}: ${seenForSource.size}`);
  if (selected.length >= targetNewRecords) break;
}

if (selected.length < targetNewRecords) throw new Error(`Only found ${selected.length} records; requested ${targetNewRecords}.`);
selected.forEach((record) => validateQuote(record));
const output = {
  collection: 'In Circulation expanded public-domain draft corpus',
  generatedAt: new Date().toISOString(),
  editorialNote: 'Exact-source draft candidates. Review literary merit, passage boundaries, citation detail, and rights note before scheduling.',
  quotes: selected,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${selected.length} records to ${outputPath}`);
