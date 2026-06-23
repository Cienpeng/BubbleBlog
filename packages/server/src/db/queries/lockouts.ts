import sql from '../connection';

export interface LockoutRecord {
  id: number;
  ip: string;
  fingerprint: string;
  attempt_count: number;
  lockout_count: number;
  locked_until: Date | null;
  is_locked: boolean;
  remaining_seconds: number;
}

// Find record by ip OR fingerprint
export async function getLockout(ip: string, fingerprint: string): Promise<LockoutRecord | null> {
  try {
    const rows = await sql`
      SELECT 
        id, 
        ip, 
        fingerprint, 
        attempt_count, 
        lockout_count, 
        locked_until,
        COALESCE(locked_until > NOW(), false) AS is_locked,
        GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (locked_until - NOW()))::int, 0)) AS remaining_seconds
      FROM login_lockouts
      WHERE ip = ${ip} OR fingerprint = ${fingerprint}
      ORDER BY locked_until DESC NULLS LAST, attempt_count DESC
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as LockoutRecord) : null;
  } catch (err) {
    console.error('Failed to get lockout record:', err);
    return null;
  }
}

// Update or insert lockout record
export async function updateLockout(
  ip: string,
  fingerprint: string,
  attemptCount: number,
  lockoutCount: number,
  lockedUntil: Date | null
): Promise<void> {
  try {
    const existing = await getLockout(ip, fingerprint);
    if (existing) {
      await sql`
        UPDATE login_lockouts
        SET 
          ip = ${ip},
          fingerprint = ${fingerprint},
          attempt_count = ${attemptCount},
          lockout_count = ${lockoutCount},
          locked_until = ${lockedUntil},
          updated_at = NOW()
        WHERE id = ${existing.id}
      `;
    } else {
      await sql`
        INSERT INTO login_lockouts (ip, fingerprint, attempt_count, lockout_count, locked_until)
        VALUES (${ip}, ${fingerprint}, ${attemptCount}, ${lockoutCount}, ${lockedUntil})
      `;
    }
  } catch (err) {
    console.error('Failed to update lockout record:', err);
  }
}

// Reset lockout record on successful login
export async function resetLockout(ip: string, fingerprint: string): Promise<void> {
  try {
    await sql`
      DELETE FROM login_lockouts
      WHERE ip = ${ip} OR fingerprint = ${fingerprint}
    `;
  } catch (err) {
    console.error('Failed to reset lockout record:', err);
  }
}
