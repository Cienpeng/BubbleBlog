import '../env'; // Must be first — loads .env before connection
import sql from './connection';

const migration = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  last_active_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint VARCHAR(64) NOT NULL,
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
  token TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user ON security_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_token ON security_sessions(token);

-- Create security logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);

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
  console.log('Running migrations...');
  await sql.unsafe(migration);
  console.log('Migrations complete.');
  await sql.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
