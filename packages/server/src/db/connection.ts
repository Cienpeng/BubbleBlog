import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

function getSql() {
  if (!_sql) {
    _sql = postgres({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'bubbleblog',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bubbleblog',
      max: 5,
      idle_timeout: 30,
    });
    console.log(`[db] Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}`);
  }
  return _sql;
}

// Proxy that lazily initializes the connection
const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(_, prop) {
    return getSql()[prop as keyof ReturnType<typeof postgres>];
  },
  apply(_, _thisArg, args) {
    return getSql()(...args);
  },
}) as unknown as ReturnType<typeof postgres>;

export default sql;
