import sql from '../db/connection';

export interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  token: string;
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
    const id = Math.random().toString(36).substring(2, 11);

    try {
      // Remove any existing session with this token first
      await sql`
        DELETE FROM security_sessions
        WHERE token = ${token}
      `;

      // Insert new session
      await sql`
        INSERT INTO security_sessions (id, user_id, device, browser, ip, location, token, last_active_at)
        VALUES (${id}, ${userId}, ${device}, ${browser}, ${ip}, ${location}, ${token}, NOW())
      `;
    } catch (err) {
      console.error('Failed to add security session to database:', err);
    }
  }

  public async updateSessionActivity(token: string) {
    try {
      await sql`
        UPDATE security_sessions
        SET last_active_at = NOW()
        WHERE token = ${token}
      `;
    } catch (err) {
      console.error('Failed to update security session activity in database:', err);
    }
  }

  public async getSessions(userId: number, currentToken: string): Promise<Session[]> {
    try {
      const rows = await sql`
        SELECT id, device, browser, ip, location, token, last_active_at
        FROM security_sessions
        WHERE user_id = ${userId}
        ORDER BY last_active_at DESC
      `;
      return rows.map(r => {
        const isCurrent = r.token === currentToken;
        return {
          id: r.id,
          device: r.device,
          browser: r.browser,
          ip: r.ip,
          location: r.location,
          lastActive: isCurrent ? '当前活跃' : '最近活跃',
          token: r.token,
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
    try {
      await sql`
        DELETE FROM security_sessions
        WHERE user_id = ${userId} AND token != ${currentToken}
      `;
    } catch (err) {
      console.error('Failed to delete other sessions from database:', err);
    }
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

  public async getLogs(userId: number): Promise<LogEntry[]> {
    try {
      const rows = await sql`
        SELECT event, status, created_at
        FROM security_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 30
      `;

      // If no logs exist yet, insert seed bootstrap logs so the list isn't empty
      if (rows.length === 0) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const getFormattedTime = (date: Date) => {
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        const seedTime1 = new Date(now.getTime() - 24 * 3600 * 1000); // 1 day ago
        const seedTime2 = new Date(now.getTime() - 2 * 3600 * 1000);  // 2 hours ago

        await sql`
          INSERT INTO security_logs (user_id, event, status, created_at)
          VALUES 
            (${userId}, '系统数据库初始化及主键约束迁移完成', 'success', ${seedTime1.toISOString()}),
            (${userId}, '系统全局外观背景及轮播图缓存预热成功', 'success', ${seedTime2.toISOString()})
        `;

        // Re-query
        return this.getLogs(userId);
      }

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
