import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconStats, IconBook } from '@/components/Icons';
import { adminApi } from '@/lib/api';
import BarChart from '@/components/charts/BarChart';
import ArticleReadingCard, { type ArticleReadingStats } from '@/components/admin/ArticleReadingCard';

interface DailyViews {
  date: string;
  count: number;
}

export default function Stats() {
  const { updateToken } = useAuth();
  const navigate = useNavigate();
  const [viewsData, setViewsData] = useState<DailyViews[]>([]);
  const [articlesReading, setArticlesReading] = useState<ArticleReadingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [exportingReading, setExportingReading] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [viewsRes, readingRes] = await Promise.all([
        adminApi.get<DailyViews[]>(`/api/admin/stats/views?days=${days}`),
        adminApi.get<ArticleReadingStats[]>('/api/admin/stats/articles-reading?limit=3'),
      ]);
      if (viewsRes.newToken) updateToken(viewsRes.newToken);
      if (readingRes.newToken) updateToken(readingRes.newToken);

      setViewsData(viewsRes.data || []);
      setArticlesReading(readingRes.data || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, [days, updateToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportViews = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch('/api/admin/stats/views/export', {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('auth-unauthorized', {
            detail: '当前登录会话已失效，请重新登录',
          }));
        }
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `page_views_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || '导出访问量数据失败');
    } finally {
      setExporting(false);
    }
  };

  const handleExportReading = async () => {
    if (exportingReading) return;
    setExportingReading(true);
    try {
      const response = await fetch('/api/admin/stats/articles-reading/export', {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('auth-unauthorized', {
            detail: '当前登录会话已失效，请重新登录',
          }));
        }
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `articles_reading_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || '导出文章阅读数据失败');
    } finally {
      setExportingReading(false);
    }
  };

  // Format dates for x-axis labels
  const chartLabels = viewsData.map(d => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const chartData = viewsData.map((d, i) => ({
    label: chartLabels[i],
    value: d.count,
  }));

  const totalViews = viewsData.reduce((sum, d) => sum + d.count, 0);
  const totalSessions = articlesReading.reduce((sum, a) => sum + a.session_count, 0);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">数据统计</h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalViews} 次访问 · {totalSessions} 次阅读记录
          </p>
        </div>
      </div>

      {/* Visits bar chart */}
      <section className="glass rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-white"><IconStats size={18} className="text-gray-400 mr-2 inline" />访问量趋势</h2>
            <p className="text-xs text-gray-400 mt-0.5">每日页面访问量统计</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportViews}
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

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between text-xs pl-3.5 pr-8 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 outline-none text-text-primary dark:text-white/80 cursor-pointer font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-w-[96px]"
              >
                <span>{days === 7 ? '最近 7 天' : days === 14 ? '最近 14 天' : days === 30 ? '最近 30 天' : '最近 60 天'}</span>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-full min-w-[100px] bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl py-1 shadow-lg z-20 animate-fade-in">
                  {[7, 14, 30, 60].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setDays(val);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors block ${
                        days === val
                          ? 'bg-brand/10 text-brand font-bold dark:bg-brand/20 dark:text-brand-light'
                          : 'text-text-primary dark:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      最近 {val} 天
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] rounded-2xl bg-white/20 dark:bg-white/[0.02] animate-pulse" />
        ) : (
          <BarChart data={chartData} height={300} />
        )}
      </section>

      {/* Per-article reading donuts */}
      <section className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-white"><IconBook size={18} className="text-gray-400 mr-2 inline" />阅读时长对比</h2>
            <p className="text-xs text-gray-400 mt-0.5">预计阅读时间 vs 读者实际平均阅读时间。悬停饼图查看详情。</p>
          </div>
          <button
            type="button"
            onClick={handleExportReading}
            disabled={exportingReading}
            className="text-xs text-brand hover:underline font-bold flex items-center gap-1 focus:outline-none disabled:opacity-50 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exportingReading ? '导出中...' : '导出'}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[200px] rounded-2xl bg-white/20 dark:bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {articlesReading.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">暂无最新阅读数据</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">读者开始阅读后，这里将自动显示最近阅读记录</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articlesReading.map(article => (
                  <ArticleReadingCard key={article.article_id} article={article} />
                ))}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/stats/articles')}
                className="px-5 py-2 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 dark:bg-brand/20 dark:text-brand-light dark:hover:bg-brand/30 rounded-xl transition-all"
              >
                查看更多
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
