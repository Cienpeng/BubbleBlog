import sql from '../connection';
import type { SearchResult } from '@bubbleblog/shared';

const START_MARKER = '__BUBBLE_MARK_START__';
const END_MARKER = '__BUBBLE_MARK_END__';

export async function searchArticles(query: string): Promise<SearchResult[]> {
  const terms = splitSearchTerms(query);
  if (terms.length === 0) return [];

  const patterns = terms.map(term => `%${escapeLikePattern(term)}%`);
  const fullPattern = `%${escapeLikePattern(query)}%`;
  const matchAllTerms = terms
    .map((term, index) => sql`(
      COALESCE(a.search_vector @@ plainto_tsquery('english', ${term}), false)
      OR a.title ILIKE ${patterns[index]} ESCAPE '\\'
      OR a.content_md ILIKE ${patterns[index]} ESCAPE '\\'
    )`)
    .reduce((combined, condition) => sql`${combined} AND ${condition}`);

  const rows = await sql`
    WITH search_terms(term, pattern) AS (
      SELECT * FROM unnest(${terms}::text[], ${patterns}::text[])
    )
    SELECT a.id, a.title, a.slug, a.excerpt, a.published_at,
           COALESCE(
             (
               SELECT
                 CASE WHEN content_hit.match_position > 80 THEN '…' ELSE '' END ||
                 substring(
                   a.content_md
                   FROM GREATEST(content_hit.match_position - 80, 1)
                   FOR 240
                 ) ||
                 CASE
                   WHEN char_length(a.content_md) > GREATEST(content_hit.match_position - 80, 1) + 239
                     THEN '…'
                   ELSE ''
                 END
               FROM (
                 SELECT strpos(lower(a.content_md), lower(st.term)) AS match_position
                 FROM search_terms st
                 WHERE strpos(lower(a.content_md), lower(st.term)) > 0
                 ORDER BY match_position
                 LIMIT 1
               ) content_hit
             ),
             ts_headline(
               'english',
               a.content_md,
               plainto_tsquery('english', ${query}),
               ${`MaxWords=40, MinWords=20, ShortWord=3, HighlightAll=false, StartSel=${START_MARKER}, StopSel=${END_MARKER}`}
             )
           ) AS headline
    FROM articles a
    WHERE a.status = 'published'
      AND ${matchAllTerms}
    ORDER BY
      CASE WHEN lower(a.title) = lower(${query}) THEN 1 ELSE 0 END DESC,
      CASE WHEN a.title ILIKE ${fullPattern} ESCAPE '\\' THEN 1 ELSE 0 END DESC,
      (
        SELECT COUNT(*)
        FROM search_terms st
        WHERE a.title ILIKE st.pattern ESCAPE '\\'
      ) DESC,
      COALESCE((
        SELECT SUM(ts_rank(a.search_vector, plainto_tsquery('english', st.term)))
        FROM search_terms st
      ), 0) DESC,
      (
        SELECT COUNT(*)
        FROM search_terms st
        WHERE a.content_md ILIKE st.pattern ESCAPE '\\'
      ) DESC,
      a.published_at DESC NULLS LAST
    LIMIT 20`;

  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    headline: formatSearchHeadline(row.headline, terms),
    published_at: row.published_at,
  })) as SearchResult[];
}

export function splitSearchTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const term of query.trim().split(/\s+/u)) {
    if (!term) continue;
    const normalized = term.toLocaleLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    terms.push(term);
  }

  return terms;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function formatSearchHeadline(value: unknown, terms: string[]): string {
  const marked = markExactTerms(String(value ?? ''), terms, START_MARKER, END_MARKER);
  return escapeHeadline(marked, START_MARKER, END_MARKER);
}

function markExactTerms(value: string, terms: string[], startMarker: string, endMarker: string): string {
  const escapedTerms = [...terms]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (escapedTerms.length === 0) return value;

  const termPattern = new RegExp(escapedTerms.join('|'), 'giu');
  const markPlainText = (text: string) => text.replace(
    termPattern,
    match => `${startMarker}${match}${endMarker}`,
  );

  let result = '';
  let cursor = 0;
  while (cursor < value.length) {
    const markedStart = value.indexOf(startMarker, cursor);
    if (markedStart === -1) {
      result += markPlainText(value.slice(cursor));
      break;
    }

    result += markPlainText(value.slice(cursor, markedStart));
    const contentStart = markedStart + startMarker.length;
    const markedEnd = value.indexOf(endMarker, contentStart);
    if (markedEnd === -1) {
      result += markPlainText(value.slice(markedStart));
      break;
    }

    result += value.slice(markedStart, markedEnd + endMarker.length);
    cursor = markedEnd + endMarker.length;
  }

  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHeadline(value: string, startMarker: string, endMarker: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replaceAll(startMarker, '<mark>')
    .replaceAll(endMarker, '</mark>');
}
