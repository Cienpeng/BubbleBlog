import sql from '../connection';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql`SELECT value FROM site_settings WHERE key = ${key}`;
  return rows.length > 0 ? rows[0].value : null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await sql`SELECT key, value FROM site_settings`;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}
