import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { IconStats, IconBook } from '@/components/Icons';
import { adminApi } from '@/lib/api';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';

interface DailyViews {
  date: string;
  count: number;
}

interface ArticleReading {
  article_id: number;
  title: string;
  slug: string;
  estimated_minutes: number;
  actual_avg_seconds: number;
  actual_avg_minutes: number;
  session_count: number;
  likes_count: number;
}

export default function Stats() {
  const { updateToken } = useAuth();
  const [viewsData, setViewsData] = useState<DailyViews[]>([]);
  const [articlesReading, setArticlesReading] = useState<ArticleReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // View more articles states
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [loadingArticlesList, setLoadingArticlesList] = useState(false);
  const [showArticlesList, setShowArticlesList] = useState(false);
  const [loadingArticleId, setLoadingArticleId] = useState<number | null>(null);

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
        adminApi.get<ArticleReading[]>('/api/admin/stats/articles-reading?limit=3'),
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

  const handleViewMoreClick = async () => {
    setShowArticlesList(true);
    if (allArticles.length === 0) {
      setLoadingArticlesList(true);
      try {
        const { data } = await adminApi.get<any[]>('/api/articles/admin/all');
        setAllArticles(data || []);
      } catch (err) {
        console.error('Failed to load article list:', err);
      } finally {
        setLoadingArticlesList(false);
      }
    }
  };

  const handleLoadArticleStats = async (articleId: number) => {
    setLoadingArticleId(articleId);
    try {
      const { data, newToken } = await adminApi.get<ArticleReading>(`/api/admin/stats/reading/${articleId}`);
      if (newToken) updateToken(newToken);
      if (data) {
        setArticlesReading(prev => {
          if (prev.some(r => r.article_id === articleId)) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error('Failed to load article stats:', err);
      alert('加载文章统计数据失败');
    } finally {
      setLoadingArticleId(null);
    }
  };

  const filteredArticles = allArticles.filter(art =>
    !articlesReading.some(r => r.article_id === art.id)
  );

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

        {loading ? (
          <div className="h-[300px] rounded-2xl bg-white/20 dark:bg-white/[0.02] animate-pulse" />
        ) : (
          <BarChart data={chartData} height={300} />
        )}
      </section>

      {/* Per-article reading donuts */}
      <section className="glass rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-text-primary dark:text-white"><IconBook size={18} className="text-gray-400 mr-2 inline" />阅读时长对比</h2>
          <p className="text-xs text-gray-400 mt-0.5">预计阅读时间 vs 读者实际平均阅读时间。悬停饼图查看详情。</p>
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
                  <div
                    key={article.article_id}
                    className="glass rounded-2xl p-5 flex flex-col items-center card-tilt animate-fade-in"
                  >
                    <h3 className="text-sm font-bold text-text-primary dark:text-white text-center leading-snug mb-4 line-clamp-2">
                      {article.title || '未命名'}
                    </h3>

                    <DonutChart
                      estimatedMinutes={article.estimated_minutes}
                      actualAvgMinutes={article.actual_avg_minutes}
                      sessionCount={article.session_count}
                      size={200}
                    />

                    {/* Quick stats */}
                    <div className="flex gap-4 mt-3 text-center">
                      <div>
                        <div className="text-lg font-extrabold text-brand">
                          {article.estimated_minutes}
                        </div>
                        <div className="text-[10px] text-gray-400">预计(分钟)</div>
                      </div>
                      <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
                      <div>
                        <div className="text-lg font-extrabold text-link">
                          {article.actual_avg_minutes > 0
                            ? article.actual_avg_minutes.toFixed(1)
                            : '—'}
                        </div>
                        <div className="text-[10px] text-gray-400">实际(分钟)</div>
                      </div>
                      <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
                      <div>
                        <div className="text-lg font-extrabold text-like">
                          {article.session_count}
                        </div>
                        <div className="text-[10px] text-gray-400">阅读次数</div>
                      </div>
                      <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
                      <div>
                        <div className="text-lg font-extrabold text-red-500">
                          {article.likes_count || 0}
                        </div>
                        <div className="text-[10px] text-gray-400">点赞数</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showArticlesList ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleViewMoreClick}
                  className="px-5 py-2 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 dark:bg-brand/20 dark:text-brand-light dark:hover:bg-brand/30 rounded-xl transition-all"
                >
                  查看更多
                </button>
              </div>
            ) : (
              <div className="mt-6 border-t border-black/5 dark:border-white/5 pt-6 animate-fade-in space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-text-primary dark:text-white">
                    文章列表 (点击加载特定文章的阅读时长卡片)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowArticlesList(false)}
                    className="text-xs text-gray-400 hover:text-brand transition-colors font-semibold"
                  >
                    收起列表
                  </button>
                </div>
                {loadingArticlesList ? (
                  <div className="flex justify-center py-4">
                    <span className="text-xs text-gray-400 animate-pulse">加载文章列表中...</span>
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <p className="text-xs text-gray-400">没有更多其他文章了</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredArticles.map(art => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleLoadArticleStats(art.id)}
                        disabled={loadingArticleId === art.id}
                        className="flex items-center justify-between text-left p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] hover:bg-brand/[0.03] hover:border-brand/30 dark:hover:bg-brand/[0.03] dark:hover:border-brand/30 transition-all group disabled:opacity-60"
                      >
                        <span className="text-xs text-text-primary dark:text-white/80 font-medium line-clamp-1 flex-1 mr-2 group-hover:text-brand transition-colors">
                          {art.title || '未命名'}
                        </span>
                        <span className="text-[10px] text-gray-400 group-hover:text-brand/80 transition-colors flex-shrink-0 flex items-center gap-0.5">
                          {loadingArticleId === art.id ? (
                            <span className="animate-spin mr-1">···</span>
                          ) : (
                            <>
                              加载卡片
                              <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
