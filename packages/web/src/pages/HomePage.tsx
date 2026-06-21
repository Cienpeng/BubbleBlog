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

function parseBioAndSocials(rawBio: string | null) {
  if (!rawBio) return { bioText: '', socials: { github: '', email: '', bilibili: '', twitter: '' } };
  try {
    const data = JSON.parse(rawBio);
    if (data && typeof data === 'object' && ('bio' in data || 'github' in data || 'email' in data || 'bilibili' in data || 'twitter' in data)) {
      return {
        bioText: data.bio || '',
        socials: {
          github: data.github || '',
          email: data.email || '',
          bilibili: data.bilibili || '',
          twitter: data.twitter || '',
        }
      };
    }
  } catch (e) {
    // Not JSON
  }
  return { bioText: rawBio, socials: { github: '', email: '', bilibili: '', twitter: '' } };
}

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const { bioText, socials } = parseBioAndSocials(author?.bio || null);
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
    <div className="max-w-[1360px] mx-auto px-8 sm:px-12 pt-[22vh] sm:pt-[26vh] pb-8">
      <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
        <div className="flex-1 lg:w-[75%]">
          <BentoGrid>
            {articles.map((article, i) => {
              const variant = i === 0 ? 'feature' : i <= 2 ? 'normal' : 'compact';
              const isFeature = variant === 'feature';
              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant={variant}
                  rotation={0}
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

        <aside className="lg:w-[25%] flex-shrink-0 space-y-4">
          <div className="relative">
            <img 
              src="/author-card-banner.png" 
              alt="" 
              className="absolute bottom-full right-0 w-1/2 h-auto object-contain z-20 pointer-events-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <GlassCard className="p-6 text-center relative overflow-hidden">
            {author?.avatar_url ? (
              <div className="relative w-20 h-20 mx-auto mb-4 rounded-full ring-4 ring-brand/15 ring-offset-2 dark:ring-offset-black overflow-hidden shadow-sm">
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand/20 to-purple-500/20 ring-4 ring-brand/15 ring-offset-2 dark:ring-offset-black mx-auto mb-4 flex items-center justify-center shadow-sm">
                <IconUser size={30} className="text-brand dark:text-brand-light" />
              </div>
            )}
            <h3 className="font-black text-lg text-text-primary dark:text-white">
              {author?.display_name || '作者'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 px-2">
              {bioText || '技术写作者'}
            </p>
            {author?.tags && author.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-3.5">
                {author.tags.slice(0, 5).map(t => (
                  <span key={t.id} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* Social Icons row */}
            {(socials.github || socials.email || socials.bilibili || socials.twitter) && (
              <div className="flex justify-center items-center gap-4 mt-4 text-gray-400 dark:text-gray-500">
                {socials.github && (
                  <a
                    href={socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand dark:hover:text-brand-light transition-colors"
                    title="GitHub"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                  </a>
                )}
                {socials.email && (
                  <a
                    href={`mailto:${socials.email}`}
                    className="hover:text-brand dark:hover:text-brand-light transition-colors"
                    title="Email"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </a>
                )}
                {socials.bilibili && (
                  <a
                    href={socials.bilibili}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand dark:hover:text-brand-light transition-colors"
                    title="Bilibili"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <rect x="2" y="6" width="20" height="14" rx="4" />
                      <path d="M7 2l3 4M17 2l-3 4" />
                      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      <path d="M9 16c1 1.5 5 1.5 6 0" />
                    </svg>
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand dark:hover:text-brand-light transition-colors"
                    title="Twitter / X"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Writer Stats Counter Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 mt-5 border-t border-black/[0.04] dark:border-white/[0.04] text-center">
              <div>
                <div className="text-lg font-black text-brand dark:text-brand-light">{articles.length}</div>
                <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">文章数</div>
              </div>
              <div>
                <div className="text-lg font-black text-brand dark:text-brand-light">{tags.length}</div>
                <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">标签分类</div>
              </div>
            </div>
          </GlassCard>
        </div>

          <TagCloud tags={tags} />
          <CalendarCard />
        </aside>
      </div>

    </div>
  );
}
