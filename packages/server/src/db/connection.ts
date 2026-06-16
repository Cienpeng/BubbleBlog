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

// Proxy that lazily initializes the connection on first use
// Target must be callable (Function) for tagged template support
const sql = new Proxy(function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  return (getSql() as any)(strings, ...values);
}, {
  get(_target, prop: string) {
    return (getSql() as any)[prop];
  },
}) as unknown as ReturnType<typeof postgres>;

export default sql;
