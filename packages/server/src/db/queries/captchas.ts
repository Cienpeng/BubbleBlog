import sql from '../connection';

export async function saveCaptcha(id: string, code: string, expiresAt: Date): Promise<void> {
  try {
    await sql`
      INSERT INTO captchas (id, code, expires_at)
      VALUES (${id}, ${code.toLowerCase()}, ${expiresAt})
      ON CONFLICT (id) DO UPDATE
      SET code = ${code.toLowerCase()}, expires_at = ${expiresAt}
    `;
  } catch (err) {
    console.error('Failed to save captcha:', err);
  }
}

export async function verifyAndConsumeCaptcha(id: string, code: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT code, (expires_at > NOW()) as is_valid
      FROM captchas
      WHERE id = ${id}
    `;
    if (rows.length === 0) return false;
    const record = rows[0];

    // Delete the captcha immediately so it cannot be reused (one-time use)
    await sql`
      DELETE FROM captchas
      WHERE id = ${id}
    `;

    if (!record.is_valid) {
      return false;
    }
    return record.code === code.toLowerCase();
  } catch (err) {
    console.error('Failed to verify/consume captcha:', err);
    return false;
  }
}
