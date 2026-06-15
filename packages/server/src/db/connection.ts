import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'bubbleblog',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bubbleblog',
  max: 5, // small pool for 1GB server
  idle_timeout: 30,
});

export default sql;
