import sql from '../connection';

// ---- Page Views ----

export async function recordPageView(articleId: number, fingerprint: string): Promise<void> {
  await sql`
    INSERT INTO page_views (article_id, fingerprint, visited_at)
    SELECT ${articleId}, ${fingerprint}, NOW()
    FROM articles
    WHERE id = ${articleId} AND status = 'published'
  `;
}

export interface DailyViews {
  date: string;
  count: number;
}

export async function getDailyViews(days: number = 30): Promise<DailyViews[]> {
  const rows = await sql`
    SELECT
      DATE(visited_at) AS date,
      COUNT(*)::int AS count
    FROM page_views
    WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
    GROUP BY DATE(visited_at)
    ORDER BY date
  `;
  return rows as DailyViews[];
}

// ---- Reading Sessions ----

export async function recordReadingSession(
  articleId: number,
  fingerprint: string,
  durationSeconds: number
): Promise<void> {
  if (durationSeconds < 1 || durationSeconds > 7200) return; // Ignore <1s or >2h
  await sql`
    INSERT INTO reading_sessions (article_id, fingerprint, duration_seconds, created_at)
    SELECT ${articleId}, ${fingerprint}, ${durationSeconds}, NOW()
    FROM articles
    WHERE id = ${articleId} AND status = 'published'
  `;
}

export interface ArticleReadingStats {
  article_id: number;
  title: string;
  slug: string;
  estimated_minutes: number;
  actual_avg_seconds: number;
  actual_avg_minutes: number;
  session_count: number;
}

export async function getAllArticlesReadingStats(): Promise<ArticleReadingStats[]> {
  const rows = await sql`
    SELECT
      a.id AS article_id,
      a.title,
      a.slug,
      COALESCE(a.reading_time, 1) AS estimated_minutes,
      COALESCE(AVG(rs.duration_seconds), 0) AS actual_avg_seconds,
      COALESCE(AVG(rs.duration_seconds) / 60.0, 0) AS actual_avg_minutes,
      COUNT(rs.id)::int AS session_count,
      (SELECT COUNT(*)::int FROM likes l WHERE l.article_id = a.id) AS likes_count
    FROM articles a
    LEFT JOIN reading_sessions rs ON rs.article_id = a.id
    GROUP BY a.id, a.title, a.slug, a.reading_time
    ORDER BY a.id DESC
  `;
  return rows as ArticleReadingStats[];
}

export async function getLatestArticlesReadingStats(limit: number = 3): Promise<ArticleReadingStats[]> {
  const rows = await sql`
    SELECT
      a.id AS article_id,
      a.title,
      a.slug,
      COALESCE(a.reading_time, 1) AS estimated_minutes,
      COALESCE(AVG(rs.duration_seconds), 0) AS actual_avg_seconds,
      COALESCE(AVG(rs.duration_seconds) / 60.0, 0) AS actual_avg_minutes,
      COUNT(rs.id)::int AS session_count,
      (SELECT COUNT(*)::int FROM likes l WHERE l.article_id = a.id) AS likes_count
    FROM articles a
    LEFT JOIN reading_sessions rs ON rs.article_id = a.id
    GROUP BY a.id, a.title, a.slug, a.reading_time
    ORDER BY a.id DESC
    LIMIT ${limit}
  `;
  return rows as ArticleReadingStats[];
}

export async function getArticleReadingStats(articleId: number): Promise<ArticleReadingStats | null> {
  const rows = await sql`
    SELECT
      a.id AS article_id,
      a.title,
      a.slug,
      COALESCE(a.reading_time, 1) AS estimated_minutes,
      COALESCE(AVG(rs.duration_seconds), 0) AS actual_avg_seconds,
      COALESCE(AVG(rs.duration_seconds) / 60.0, 0) AS actual_avg_minutes,
      COUNT(rs.id)::int AS session_count,
      (SELECT COUNT(*)::int FROM likes l WHERE l.article_id = a.id) AS likes_count
    FROM articles a
    LEFT JOIN reading_sessions rs ON rs.article_id = a.id
    WHERE a.id = ${articleId}
    GROUP BY a.id, a.title, a.slug, a.reading_time
  `;
  return rows.length > 0 ? (rows[0] as ArticleReadingStats) : null;
}
