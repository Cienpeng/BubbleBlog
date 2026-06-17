import { useState, useEffect, useCallback } from 'react';
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
}

export default function Stats() {
  const { updateToken } = useAuth();
  const [viewsData, setViewsData] = useState<DailyViews[]>([]);
  const [articlesReading, setArticlesReading] = useState<ArticleReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [viewsRes, readingRes] = await Promise.all([
        adminApi.get<DailyViews[]>(`/api/admin/stats/views?days=${days}`),
        adminApi.get<ArticleReading[]>('/api/admin/stats/articles-reading'),
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
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none text-text-primary dark:text-white/80 cursor-pointer"
          >
            <option value={7}>最近 7 天</option>
            <option value={14}>最近 14 天</option>
            <option value={30}>最近 30 天</option>
            <option value={60}>最近 60 天</option>
          </select>
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
        ) : articlesReading.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">暂无阅读数据</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">读者开始阅读后，这里将显示阅读时长对比</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articlesReading.map(article => (
              <div
                key={article.article_id}
                className="glass rounded-2xl p-5 flex flex-col items-center card-tilt"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
