import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ArticleListItem, Tag } from '@bubbleblog/shared';
import { api } from '@/lib/api';
import BentoGrid from '@/components/BentoGrid';
import ArticleCard from '@/components/ArticleCard';
import TagCloud from '@/components/TagCloud';
import GlassCard from '@/components/GlassCard';
import { IconUser } from '@/components/Icons';

const ROTATIONS = [-0.3, 0.8, -1.0, 0.4, -0.6, 0.3, -0.7, 0.5, -0.4, 0.2];

interface AuthorInfo {
  display_name: string;
  bio: string;
  avatar_url: string;
  tags: { id: number; name: string; slug: string }[];
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:w-[65%]">
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

        <aside className="lg:w-[35%] space-y-4">
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
        </aside>
      </div>

    </div>
  );
}
