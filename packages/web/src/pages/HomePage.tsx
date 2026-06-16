import { useState, useEffect } from 'react';
import type { ArticleListItem, Tag } from '@bubbleblog/shared';
import { api } from '@/lib/api';
import BentoGrid from '@/components/BentoGrid';
import ArticleCard from '@/components/ArticleCard';
import TagCloud from '@/components/TagCloud';
import GlassCard from '@/components/GlassCard';
import Footer from '@/components/Footer';

const ROTATIONS = [-0.3, 0.8, -1.0, 0.4, -0.6];

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ items: ArticleListItem[]; total_pages: number }>('/api/articles?limit=5'),
      api.get<Tag[]>('/api/tags'),
    ])
      .then(([articleData, tagData]) => {
        setArticles(articleData.items);
        setHasMore(articleData.total_pages > 1);
        setTags(tagData);
      })
      .catch(() => {
        // API not available — show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    const data = await api.get<{ items: ArticleListItem[]; total_pages: number }>(`/api/articles?page=${nextPage}&limit=5`);
    setArticles(prev => [...prev, ...data.items]);
    setPage(nextPage);
    setHasMore(data.total_pages > nextPage);
  };

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
                />
              );
            })}
          </BentoGrid>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                className="px-6 py-2 rounded-[24px] glass text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
              >
                加载更多 →
              </button>
            </div>
          )}
        </div>

        <aside className="lg:w-[35%] space-y-4">
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand to-purple-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg text-text-primary dark:text-white">Luiyu</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">全栈开发者 · 技术写作者</p>
          </GlassCard>

          <TagCloud tags={tags} />
        </aside>
      </div>

      <Footer />
    </div>
  );
}
