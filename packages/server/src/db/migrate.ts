import '../env'; // Must be first — loads .env before connection
import sql from './connection';

const migration = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio TEXT DEFAULT '',
  avatar_url VARCHAR(500) DEFAULT '',
  last_active_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure display_name, bio, avatar_url columns exist (for backwards compatibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '';

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content_md TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  excerpt VARCHAR(500),
  cover_image VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  reading_time INTEGER DEFAULT 1,
  search_vector TSVECTOR,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL
);

-- Article-Tags junction
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- User-tags junction
CREATE TABLE IF NOT EXISTS user_tags (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (article_id, fingerprint)
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size INTEGER NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_likes_article ON likes(article_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at DESC);

-- Full-text search: trigger for auto-updating search_vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_md, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_search_vector ON articles;
CREATE TRIGGER trg_search_vector
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Create GIN index for full text search
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);

-- Accelerate literal substring searches for Chinese and mixed-language queries.
-- Partial indexes keep drafts out because the public search API only returns
-- published articles.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm_published
  ON articles USING GIN(title gin_trgm_ops)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_content_trgm_published
  ON articles USING GIN(content_md gin_trgm_ops)
  WHERE status = 'published';

-- Rows created before the search trigger existed may not have a vector yet.
UPDATE articles
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content_md, '')), 'B')
WHERE search_vector IS NULL;

-- Site settings (key-value)
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Carousel images
CREATE TABLE IF NOT EXISTS carousel_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  image_url VARCHAR(1000) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carousel_article ON carousel_images(article_id);
CREATE INDEX IF NOT EXISTS idx_carousel_default ON carousel_images(is_default) WHERE is_default = true;

-- Insert default background_image setting
INSERT INTO site_settings (key, value) VALUES ('background_image', '')
ON CONFLICT (key) DO NOTHING;

-- Insert 5 default carousel wallpapers if none exist
INSERT INTO carousel_images (image_url, sort_order, is_default)
SELECT v.url, v.sort_order, true
FROM (VALUES
  ('__DEFAULT_GRADIENT_1__', 0),
  ('__DEFAULT_GRADIENT_2__', 1),
  ('__DEFAULT_GRADIENT_3__', 2),
  ('__DEFAULT_GRADIENT_4__', 3),
  ('__DEFAULT_GRADIENT_5__', 4)
) AS v(url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM carousel_images WHERE is_default = true);

-- Create security sessions table
CREATE TABLE IF NOT EXISTS security_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device VARCHAR(255) NOT NULL,
  browser VARCHAR(255) NOT NULL,
  ip VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  last_active_at TIMESTAMP DEFAULT NOW(),
  token_hash VARCHAR(64),
  previous_token_hash VARCHAR(64),
  previous_token_valid_until TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user ON security_sessions(user_id);

-- Migrate away from reusable plaintext bearer tokens. Existing sessions are
-- deliberately invalidated because hashes cannot safely be reconstructed in SQL.
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS previous_token_hash VARCHAR(64);
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS previous_token_valid_until TIMESTAMP;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'security_sessions' AND column_name = 'token'
  ) THEN
    DELETE FROM security_sessions;
    DROP INDEX IF EXISTS idx_security_sessions_token;
    ALTER TABLE security_sessions DROP COLUMN token;
  END IF;
END $$;
ALTER TABLE security_sessions ALTER COLUMN token_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_sessions_token_hash ON security_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_security_sessions_previous_token_hash ON security_sessions(previous_token_hash);

-- Create security logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_created ON security_logs(user_id, created_at DESC);

-- Page views for daily visit tracking
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(512) NOT NULL,
  visited_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_article ON page_views(article_id);
CREATE INDEX IF NOT EXISTS idx_page_views_article_date ON page_views(article_id, visited_at);
-- Never delete historical analytics during an automatic migration. If a
-- legacy database contains duplicate daily rows, unique-index creation fails
-- safely so an operator can archive or merge them explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_views_daily_unique
  ON page_views(article_id, fingerprint, (visited_at::date));

-- Reading sessions for actual reading time tracking
CREATE TABLE IF NOT EXISTS reading_sessions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(512) NOT NULL,
  duration_seconds REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_article ON reading_sessions(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_article_date ON reading_sessions(article_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_sessions_daily_unique
  ON reading_sessions(article_id, fingerprint, (created_at::date));

-- Login lockouts table for limiting failed attempts and tracking blocks
CREATE TABLE IF NOT EXISTS login_lockouts (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(100) NOT NULL,
  fingerprint VARCHAR(512) NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  lockout_count INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_login_lockouts_ip_fingerprint ON login_lockouts(ip, fingerprint);
CREATE INDEX IF NOT EXISTS idx_login_lockouts_locked ON login_lockouts(locked_until);
CREATE INDEX IF NOT EXISTS idx_login_lockouts_fingerprint ON login_lockouts(fingerprint);

-- Captchas table for validating verification codes
CREATE TABLE IF NOT EXISTS captchas (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);

`;

async function migrate() {
  console.log('Running migrations...');
  try {
    // postgres.js connection pools must reserve one connection for the whole
    // transaction. Do not put literal BEGIN/COMMIT statements in sql.unsafe().
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
    });
    console.log('Migrations complete.');
  } finally {
    await sql.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
