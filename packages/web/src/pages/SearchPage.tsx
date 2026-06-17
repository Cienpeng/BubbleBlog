import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { SearchResult, ArticleListItem } from '@bubbleblog/shared';
import SearchBar from '../components/SearchBar';
import { IconList, IconArrowLeft } from '../components/Icons';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // All articles for browse mode (no query)
  const [allArticles, setAllArticles] = useState<ArticleListItem[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search mode
  useEffect(() => {
    if (!query.trim()) {
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    api.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, [query]);

  // Browse mode: show all published articles
  useEffect(() => {
    if (query.trim()) return; // Only in browse mode
    setLoading(true);
    api.get<{ items: ArticleListItem[]; total_pages: number }>('/api/articles?limit=20')
      .then(data => {
        setAllArticles(data.items);
        setHasMore(data.total_pages > 1);
        setBrowsePage(1);
      })
      .catch(() => setAllArticles([]))
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = async () => {
    const nextPage = browsePage + 1;
    setLoadingMore(true);
    try {
      const data = await api.get<{ items: ArticleListItem[]; total_pages: number }>(
        `/api/articles?page=${nextPage}&limit=20`
      );
      setAllArticles(prev => [...prev, ...data.items]);
      setBrowsePage(nextPage);
      setHasMore(data.total_pages > nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // Browse mode: all articles
  if (!query.trim()) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <SearchBar initialQuery="" />

        <div className="mt-6">
          <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4">
            <IconList size={18} className="text-gray-400 mr-2 inline" />全部文章
          </h2>

          {loading ? (
            <div className="text-center text-gray-400 animate-pulse py-12">加载中...</div>
          ) : allArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">还没有文章</p>
              <Link to="/" className="text-link hover:underline text-sm mt-2 inline-block">
                <IconArrowLeft size={14} className="mr-1 inline" />返回首页
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {allArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/article/${article.slug}`}
                    className="block glass rounded-2xl p-4 card-tilt"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary dark:text-white text-sm leading-snug line-clamp-1">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-shrink-0">
                        {article.tags?.slice(0, 2).map(t => (
                          <span key={t.id} className="px-2 py-0.5 rounded-full bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
                            {t.name}
                          </span>
                        ))}
                        <span>{article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 rounded-[24px] glass text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  >
                    {loadingMore ? '加载中...' : '加载更多 →'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    );
  }

  // Search mode
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SearchBar initialQuery={query} />

      <div className="mt-8">
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse py-12">搜索中...</div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">未找到结果</p>
            <p className="text-gray-400 text-sm mt-2">试试其他关键词？</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(r => (
              <Link key={r.id} to={`/article/${r.slug}`} className="block glass rounded-2xl p-5 card-tilt">
                <h3 className="font-bold text-text-primary dark:text-white mb-1">{r.title}</h3>
                {r.headline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: r.headline }} />
                )}
                <span className="text-[10px] text-gray-400 mt-2 block">
                  {r.published_at ? new Date(r.published_at).toLocaleDateString('zh-CN') : ''}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
