import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import GlassCard from '@/components/GlassCard';
import { IconShield } from '@/components/Icons';

const IconLaptop = () => (
  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconSmartphone = () => (
  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const IconActivity = () => (
  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

interface Session {
  id: string;
  isCurrent: boolean;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
}

interface LogEntry {
  time: string;
  event: string;
  status: 'success' | 'warn';
}

export default function Security() {
  const { updateToken } = useAuth();
  const [role, setRole] = useState('系统超级管理员 (Owner)');
  const [singleSession, setSingleSession] = useState(false);
  const [togglingSSO, setTogglingSSO] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = useCallback(async () => {
    try {
      const { data, newToken } = await adminApi.get<{ role: string; singleSessionEnabled: boolean; sessions: Session[]; logs: LogEntry[] }>('/api/admin/security');
      if (newToken) updateToken(newToken);
      setRole(data.role || '系统超级管理员 (Owner)');
      setSingleSession(data.singleSessionEnabled || false);
      setSessions(data.sessions || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('加载安全中心数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handleToggleSingleSession = async () => {
    setTogglingSSO(true);
    const nextVal = !singleSession;
    try {
      const { data, newToken } = await adminApi.post<{ enabled: boolean }>('/api/admin/security/toggle-single-session', { enabled: nextVal });
      if (newToken) updateToken(newToken);
      setSingleSession(data.enabled);
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message || '切换单终端登录限制失败');
    } finally {
      setTogglingSSO(false);
    }
  };

  const handleLogoutOthers = async () => {
    if (!confirm('确定要清除并注销其他所有设备的活跃登录会话吗？')) return;
    try {
      const { data, newToken } = await adminApi.post<{ message: string }>('/api/admin/security/logout-others', {});
      if (newToken) updateToken(newToken);
      alert(data.message || '已成功清理并注销其他设备的活跃会话');
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportLogs = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/admin/security/logs/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('导出失败');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || '导出审计日志失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-white/20 dark:bg-white/[0.03] rounded-xl" />
        <div className="h-64 bg-white/20 dark:bg-white/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">安全与会话</h1>
        <p className="text-sm text-gray-400 mt-1">
          管理您当前的后台安全设置、登录设备会话，以及审计历史操作日志。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Security Settings */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <IconShield className="text-brand" size={20} />
              <h2 className="text-base font-bold text-text-primary dark:text-white">账号安全配置</h2>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">系统角色</label>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
                  {role}
                </div>
              </div>

              <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white">限制单终端登录</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">同一账号仅允许在一个终端在线</p>
                </div>
                <button
                  type="button"
                  disabled={togglingSSO}
                  onClick={handleToggleSingleSession}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    singleSession ? 'bg-brand' : 'bg-black/10 dark:bg-white/10'
                  } ${togglingSSO ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      singleSession ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">登录会话有效期</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">当前设定为：60 小时无操作过期</p>
              </div>

              <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    alert('本地缓存数据已清理完毕');
                    window.location.reload();
                  }}
                  className="w-full py-2 rounded-xl border border-like/20 text-like text-xs font-semibold hover:bg-like/5 transition-colors"
                >
                  清理本地会话缓存
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Center Column: Active Sessions */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <h2 className="text-base font-bold text-text-primary dark:text-white">活跃登录会话</h2>
              </div>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleLogoutOthers}
                  className="text-xs text-like hover:underline font-bold"
                >
                  清除其他
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sessions.map(session => (
                <div 
                  key={session.id} 
                  className={`p-4 rounded-xl border flex gap-3 ${
                    session.isCurrent 
                      ? 'bg-brand/[0.02] dark:bg-brand/[0.02] border-brand/20 dark:border-brand/20' 
                      : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5'
                  }`}
                >
                  <div className="mt-0.5">
                    {session.device.includes('PC') || session.device.includes('Mac') || session.device.includes('Win') ? (
                      <IconLaptop />
                    ) : (
                      <IconSmartphone />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-text-primary dark:text-white">
                        {session.device}
                      </span>
                      {session.isCurrent ? (
                        <span className="flex items-center gap-1 text-[9px] text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded">
                          <span className="w-1 h-1 bg-brand rounded-full animate-pulse" />
                          当前设备
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {session.lastActive}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5">
                      <p>浏览器：{session.browser}</p>
                      <p>IP 地址：{session.ip}</p>
                      <p>登录归属：{session.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Security Audit Log */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconActivity />
                <h2 className="text-base font-bold text-text-primary dark:text-white">操作审计日志</h2>
              </div>
              <button
                type="button"
                onClick={handleExportLogs}
                disabled={exporting}
                className="text-xs text-brand hover:underline font-bold flex items-center gap-1 focus:outline-none disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {exporting ? '导出中...' : '导出'}
              </button>
            </div>

            <div className="relative pl-4 border-l border-black/5 dark:border-white/5 space-y-6 py-2 max-h-[480px] overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="relative space-y-1">
                  {/* Circle dot on timeline */}
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 ring-4 ring-white dark:ring-zinc-950 flex items-center justify-center">
                    {index === 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping absolute" />}
                    {index === 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand absolute" />}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                      {log.time}
                    </span>
                    <span className="text-[9px] text-brand font-extrabold bg-brand/5 px-1 rounded">
                      成功
                    </span>
                  </div>
                  <p className="text-xs text-text-primary dark:text-white/80 font-medium">
                    {log.event}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
