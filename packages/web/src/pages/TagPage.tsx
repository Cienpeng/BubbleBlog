import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ArticleListItem } from '@bubbleblog/shared';
import ArticleCard from '../components/ArticleCard';
import { IconArrowLeft } from '../components/Icons';

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get<{ items: ArticleListItem[] }>(`/api/articles?tag=${slug}`)
      .then(data => setArticles(data.items))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="text-sm text-gray-400 hover:text-link transition-colors"><IconArrowLeft size={14} className="mr-1 inline" />返回首页</Link>
        <h1 className="text-2xl font-extrabold text-text-primary dark:text-white mt-2">
          标签：{slug}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{articles.length} 篇文章</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 animate-pulse py-12">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {articles.map((a, i) => (
            <ArticleCard
              key={a.id}
              article={a}
              variant="normal"
              rotation={0}
              isHovered={hoveredId === a.id}
              isDimmed={hoveredId !== null && hoveredId !== a.id}
              onHover={(h) => setHoveredId(h ? a.id : null)}
            />
          ))}
        </div>
      )}

      {!loading && articles.length === 0 && (
        <div className="text-center py-12 text-gray-400">该标签下暂无文章</div>
      )}

    </div>
  );
}
