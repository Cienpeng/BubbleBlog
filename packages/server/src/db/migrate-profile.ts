import '../env';
import sql from './connection';

const migration = `
-- Add profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '';

-- User-tags junction table
CREATE TABLE IF NOT EXISTS user_tags (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);
`;

async function migrate() {
  console.log('Running profile migration...');
  await sql.unsafe(migration);
  console.log('Profile migration complete.');
  await sql.end();
}

migrate().catch((err) => {
  console.error('Profile migration failed:', err);
  process.exit(1);
});
