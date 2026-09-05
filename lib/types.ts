export const SOURCE_TYPES = [
  'Fiction', 'Poetry', 'Play', 'Nonfiction', 'Letter', 'Diary', 'Oral history',
  'Court opinion', 'Government document', 'Newspaper', 'Song', 'Other',
] as const;

export const RIGHTS_STATUSES = [
  'Verified Public Domain', 'U.S. Government Work', 'Permission / Open License',
  'Needs Review', 'Do Not Publish',
] as const;

export const SAFE_RIGHTS = RIGHTS_STATUSES.slice(0, 3);
export const QUOTE_STATUSES = ['draft', 'scheduled', 'published'] as const;

export type Quote = {
  id: string;
  quote: string;
  author: string;
  speaker: string | null;
  title: string;
  year: string | null;
  publicationDate: string | null;
  sourceType: string;
  currencyTerms: string[];
  themes: string[];
  context: string | null;
  showContext: boolean;
  repository: string | null;
  sourceUrl: string;
  sourceCitation: string | null;
  publicDomainStatus: string;
  rightsNote: string | null;
  publishDate: string | null;
  status: string;
  reusable: boolean;
  notes: string | null;
  queuePosition: number;
  createdAt: string;
  updatedAt: string;
  publishedDate?: string | null;
};

export type QuoteInput = Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'publishedDate'> & { id?: string };
