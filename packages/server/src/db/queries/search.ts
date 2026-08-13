import sql from '../connection';
import type { SearchResult } from '@bubbleblog/shared';

export async function searchArticles(query: string): Promise<SearchResult[]> {
  const startMarker = '__BUBBLE_MARK_START__';
  const endMarker = '__BUBBLE_MARK_END__';
  const rows = await sql`
    SELECT a.id, a.title, a.slug, a.excerpt, a.published_at,
           ts_headline('english', a.content_md, plainto_tsquery('english', ${query}),
             ${`MaxWords=40, MinWords=20, ShortWord=3, HighlightAll=false, StartSel=${startMarker}, StopSel=${endMarker}`}
           ) as headline
    FROM articles a
    WHERE a.status = 'published'
      AND a.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', ${query})) DESC
    LIMIT 20`;

  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    headline: escapeHeadline(r.headline, startMarker, endMarker),
    published_at: r.published_at,
  })) as SearchResult[];
}

function escapeHeadline(value: unknown, startMarker: string, endMarker: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replaceAll(startMarker, '<mark>')
    .replaceAll(endMarker, '</mark>');
}
