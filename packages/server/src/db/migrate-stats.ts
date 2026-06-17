import '../env';
import sql from './connection';

const migration = `
-- Page views for daily visit tracking
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(64) NOT NULL,
  visited_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_article ON page_views(article_id);

-- Reading sessions for actual reading time tracking
CREATE TABLE IF NOT EXISTS reading_sessions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(64) NOT NULL,
  duration_seconds REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_article ON reading_sessions(article_id);
`;

async function migrate() {
  console.log('Running stats migration...');
  await sql.unsafe(migration);
  console.log('Stats migration complete.');
  await sql.end();
}

migrate().catch((err) => {
  console.error('Stats migration failed:', err);
  process.exit(1);
});
