import sql from '../db/connection';
import { hashSessionToken } from './token-hash';

export interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  userId: number;
  isCurrent?: boolean;
}

export interface LogEntry {
  userId: number;
  time: string;
  event: string;
  status: 'success' | 'warn';
}

class SecurityService {
  private parseUA(ua: string): { device: string; browser: string } {
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('X11')) os = 'UNIX';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';
    else if (ua.includes('Edge')) browser = 'Edge';

    const deviceSuffix = (os === 'iOS' || os === 'Android') ? '智能手机' : 'PC/主机';
    return {
      device: `${os} ${deviceSuffix}`,
      browser: browser,
    };
  }

  private getIpLocation(ip: string): string {
    if (ip === '127.0.0.1' || ip === '::1' || ip.toLowerCase().includes('localhost')) {
      return '本地回环/内网开发';
    }
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.31.')) {
      return '局域网/Wi-Fi';
    }
    return '公网访问';
  }

  public async addSession(userId: number, token: string, userAgent: string, ip: string) {
    const { device, browser } = this.parseUA(userAgent);
    const location = this.getIpLocation(ip);
    const id = crypto.randomUUID();
    const tokenHash = await hashSessionToken(token);

    await sql`
      INSERT INTO security_sessions (id, user_id, device, browser, ip, location, token_hash, last_active_at)
      VALUES (${id}, ${userId}, ${device}, ${browser}, ${ip}, ${location}, ${tokenHash}, NOW())
      ON CONFLICT (token_hash) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        device = EXCLUDED.device,
        browser = EXCLUDED.browser,
        ip = EXCLUDED.ip,
        location = EXCLUDED.location,
        last_active_at = NOW()
    `;
  }

  public async getSessions(userId: number, currentToken: string): Promise<Session[]> {
    const currentTokenHash = await hashSessionToken(currentToken);
    try {
      const rows = await sql`
        SELECT id, device, browser, ip, location, token_hash,
               previous_token_hash, previous_token_valid_until, last_active_at
        FROM security_sessions
        WHERE user_id = ${userId}
        ORDER BY last_active_at DESC
      `;
      return rows.map(r => {
        const previousTokenIsCurrent =
          r.previous_token_hash === currentTokenHash &&
          r.previous_token_valid_until &&
          new Date(r.previous_token_valid_until).getTime() > Date.now();
        const isCurrent = r.token_hash === currentTokenHash || previousTokenIsCurrent;
        return {
          id: r.id,
          device: r.device,
          browser: r.browser,
          ip: r.ip,
          location: r.location,
          lastActive: isCurrent ? '当前活跃' : '最近活跃',
          userId: userId,
          isCurrent,
        };
      });
    } catch (err) {
      console.error('Failed to fetch security sessions from database:', err);
      return [];
    }
  }

  public async logoutOthers(userId: number, currentToken: string) {
    const currentTokenHash = await hashSessionToken(currentToken);
    try {
      const currentRows = await sql`
        SELECT id
        FROM security_sessions
        WHERE user_id = ${userId}
          AND (
            token_hash = ${currentTokenHash}
            OR (
              previous_token_hash = ${currentTokenHash}
              AND previous_token_valid_until > NOW()
            )
          )
        LIMIT 1
      `;
      if (currentRows.length > 0) {
        await sql`
          DELETE FROM security_sessions
          WHERE user_id = ${userId} AND id != ${currentRows[0].id}
        `;
      } else {
        // A successful new login calls this before its new session row exists.
        await sql`DELETE FROM security_sessions WHERE user_id = ${userId}`;
      }
    } catch (err) {
      console.error('Failed to delete other sessions from database:', err);
    }
  }

  public async logoutAll(userId: number) {
    await sql`DELETE FROM security_sessions WHERE user_id = ${userId}`;
  }

  public async logoutCurrent(token: string) {
    const tokenHash = await hashSessionToken(token);
    await sql`
      DELETE FROM security_sessions
      WHERE token_hash = ${tokenHash}
         OR (
           previous_token_hash = ${tokenHash}
           AND previous_token_valid_until > NOW()
         )
    `;
  }

  public async cleanupExpiredData(): Promise<void> {
    await sql`DELETE FROM security_sessions WHERE last_active_at < NOW() - INTERVAL '60 hours'`;
    await sql`
      UPDATE security_sessions
      SET previous_token_hash = NULL, previous_token_valid_until = NULL
      WHERE previous_token_valid_until <= NOW()
    `;
    await sql`
      DELETE FROM login_lockouts
      WHERE updated_at < NOW() - INTERVAL '1 day'
        AND (locked_until IS NULL OR locked_until < NOW())
    `;
    await sql`DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '180 days'`;
  }

  public async recordActivity(userId: number, event: string, status: 'success' | 'warn' = 'success') {
    try {
      await sql`
        INSERT INTO security_logs (user_id, event, status, created_at)
        VALUES (${userId}, ${event}, ${status}, NOW())
      `;
    } catch (err) {
      console.error('Failed to record security activity in database:', err);
    }
  }

  public async getLogs(userId: number, limit?: number): Promise<LogEntry[]> {
    try {
      const rows = limit !== undefined
        ? await sql`
            SELECT event, status, created_at
            FROM security_logs
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT event, status, created_at
            FROM security_logs
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
          `;

      const pad = (n: number) => String(n).padStart(2, '0');
      return rows.map(r => {
        const d = new Date(r.created_at);
        const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return {
          userId,
          time: timeStr,
          event: r.event,
          status: r.status as 'success' | 'warn',
        };
      });
    } catch (err) {
      console.error('Failed to fetch security logs from database:', err);
      return [];
    }
  }
}

export const securityService = new SecurityService();
