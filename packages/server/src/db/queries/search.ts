import sql from '../connection';
import type { SearchResult } from '@bubbleblog/shared';

export async function searchArticles(query: string): Promise<SearchResult[]> {
  const rows = await sql`
    SELECT a.id, a.title, a.slug, a.excerpt, a.published_at,
           ts_headline('english', a.content_md, to_tsquery('english', ${query}),
             'MaxWords=40, MinWords=20, ShortWord=3, HighlightAll=false, StartSel=<mark>, StopSel=</mark>'
           ) as headline
    FROM articles a
    WHERE a.status = 'published'
      AND a.search_vector @@ to_tsquery('english', ${query})
    ORDER BY ts_rank(a.search_vector, to_tsquery('english', ${query})) DESC
    LIMIT 20`;

  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    headline: r.headline,
    published_at: r.published_at,
  })) as SearchResult[];
}
