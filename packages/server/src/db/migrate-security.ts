import '../env';
import sql from './connection';

const migration = `
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
`;

async function migrate() {
  console.log('Running security migration...');
  await sql.unsafe(migration);
  console.log('Security migration complete.');
  await sql.end();
}

migrate().catch((err) => {
  console.error('Security migration failed:', err);
  process.exit(1);
});
