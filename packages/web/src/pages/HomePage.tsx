import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ArticleListItem, Tag } from '@bubbleblog/shared';
import { api } from '@/lib/api';
import BentoGrid from '@/components/BentoGrid';
import ArticleCard from '@/components/ArticleCard';
import TagCloud from '@/components/TagCloud';
import GlassCard from '@/components/GlassCard';
import { IconUser, IconCalendar } from '@/components/Icons';

const ROTATIONS = [-0.3, 0.8, -1.0, 0.4, -0.6, 0.3, -0.7, 0.5, -0.4, 0.2];

interface AuthorInfo {
  display_name: string;
  bio: string;
  avatar_url: string;
  tags: { id: number; name: string; slug: string }[];
}

function CalendarCard() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && typeof res.data.timestamp === 'number') {
          setDate(new Date(res.data.timestamp));
        } else {
          setDate(new Date());
        }
      })
      .catch(() => {
        setDate(new Date());
      });
  }, []);

  if (!date) {
    return (
      <GlassCard className="p-5 flex items-center justify-center h-48 animate-pulse">
        <div className="text-gray-400 dark:text-gray-500 text-sm">加载日历中...</div>
      </GlassCard>
    );
  }

  // Convert client-calculated UTC milliseconds to GMT+8 (Beijing Time)
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60000;
  const bjMillis = utcMillis + 8 * 3600000;
  const bjDate = new Date(bjMillis);

  const year = bjDate.getUTCFullYear();
  const month = bjDate.getUTCMonth();
  const todayDay = bjDate.getUTCDate();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const startDayOfWeek = firstDayOfMonth.getUTCDay();

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const blanks = Array(startDayOfWeek).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-center gap-2 mb-4">
        <IconCalendar size={16} className="text-brand dark:text-brand-light" />
        <span className="font-extrabold text-sm text-text-primary dark:text-white tracking-wider">
          {year}/{pad(month + 1)}/{pad(todayDay)}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
        {weekdays.map((w, idx) => (
          <span
            key={w}
            className={`font-semibold pb-1.5 border-b border-gray-100 dark:border-white/[0.06] ${
              idx === 0 || idx === 6
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {w}
          </span>
        ))}

        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const isToday = day === todayDay;

          return (
            <div key={`day-${day}`} className="flex items-center justify-center py-1">
              <span
                className={`w-7 h-7 flex items-center justify-center text-xs transition-all duration-300 rounded-full ${
                  isToday
                    ? 'bg-brand text-white font-bold shadow-[0_3px_10px_rgba(93,172,129,0.3)] dark:shadow-[0_3px_10px_rgba(125,217,164,0.2)]'
                    : 'text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 cursor-default'
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const initialArticles = useRef<ArticleListItem[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ items: ArticleListItem[]; total_pages: number }>('/api/articles?limit=5'),
      api.get<Tag[]>('/api/tags'),
      fetch('/api/profile').then(r => r.json()).then(d => d.data || null).catch(() => null),
    ])
      .then(([articleData, tagData, authorData]) => {
        setArticles(articleData.items);
        initialArticles.current = articleData.items;
        setHasMore(articleData.total_pages > 1);
        setTags(tagData);
        if (authorData) setAuthor(authorData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    const data = await api.get<{ items: ArticleListItem[]; total_pages: number }>(`/api/articles?page=${nextPage}&limit=5`);
    setArticles(prev => [...prev, ...data.items]);
    setPage(nextPage);
    setHasMore(data.total_pages > nextPage);
  };

  const collapse = () => {
    setArticles(initialArticles.current);
    setPage(1);
    setHasMore(true);
  };

  const isExpanded = articles.length > initialArticles.current.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        <div className="flex-1 lg:w-[72%]">
          <BentoGrid>
            {articles.map((article, i) => {
              const variant = i === 0 ? 'feature' : i <= 2 ? 'normal' : 'compact';
              const isFeature = variant === 'feature';
              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant={variant}
                  rotation={ROTATIONS[i] || 0}
                  style={isFeature ? { gridColumn: 'span 2' } : undefined}
                  isHovered={hoveredId === article.id}
                  isDimmed={hoveredId !== null && hoveredId !== article.id}
                  onHover={(h) => setHoveredId(h ? article.id : null)}
                />
              );
            })}
          </BentoGrid>

          <div className="text-center mt-8 flex items-center justify-center gap-4">
            {hasMore && !isExpanded && (
              <button
                onClick={loadMore}
                className="px-6 py-2 rounded-[24px] glass text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
              >
                加载更多 →
              </button>
            )}
            {isExpanded && (
              <button
                onClick={collapse}
                className="px-6 py-2 rounded-[24px] glass text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
              >
                收起 ↑
              </button>
            )}
            <Link
              to="/search"
              className="px-6 py-2 rounded-[24px] glass text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
            >
              浏览全部 →
            </Link>
          </div>
        </div>

        <aside className="lg:w-[28%] flex-shrink-0 space-y-4">
          <GlassCard className="p-6 text-center">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-purple-500 mx-auto mb-3 flex items-center justify-center">
                <IconUser size={28} className="text-white/70" />
              </div>
            )}
            <h3 className="font-bold text-lg text-text-primary dark:text-white">
              {author?.display_name || '作者'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {author?.bio || '技术写作者'}
            </p>
            {author?.tags && author.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {author.tags.map(t => (
                  <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>

          <TagCloud tags={tags} />
          <CalendarCard />
        </aside>
      </div>

    </div>
  );
}
