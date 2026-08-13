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
      DELETE FROM captchas
      WHERE id = ${id} AND expires_at > NOW()
      RETURNING code
    `;
    if (rows.length === 0) return false;
    return rows[0].code === code.toLowerCase();
  } catch (err) {
    console.error('Failed to verify/consume captcha:', err);
    return false;
  }
}

export async function deleteExpiredCaptchas(): Promise<void> {
  await sql`DELETE FROM captchas WHERE expires_at <= NOW()`;
}
