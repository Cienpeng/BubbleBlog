import sql from '../connection';
import type { UserRow } from '@bubbleblog/shared';

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
  return rows.length > 0 ? (rows[0] as UserRow) : null;
}

export async function updateLastActive(userId: number): Promise<void> {
  await sql`UPDATE users SET last_active_at = NOW() WHERE id = ${userId}`;
}

export async function createUser(username: string, passwordHash: string): Promise<UserRow> {
  const rows = await sql`
    INSERT INTO users (username, password_hash) VALUES (${username}, ${passwordHash}) RETURNING *`;
  return rows[0] as UserRow;
}
