import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { IconArrowLeft, IconBook } from '@/components/Icons';
import ArticleReadingCard, { type ArticleReadingStats } from '@/components/admin/ArticleReadingCard';

interface PublishedArticle {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  reading_time: number;
  published_at: string | null;
  updated_at: string;
}

export default function ArticleStats() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<PublishedArticle | null>(null);
  const [readingStats, setReadingStats] = useState<ArticleReadingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get<PublishedArticle[]>('/api/articles/admin/all')
      .then(({ data }) => {
        setArticles((data || []).filter(article => article.status === 'published'));
      })
      .catch(err => {
        console.error('Failed to load published articles:', err);
        setError('发布文章列表加载失败，请稍后重试');
      })
      .finally(() => setLoadingArticles(false));
  }, []);

  const closeStats = useCallback(() => {
    setSelectedArticle(null);
    setReadingStats(null);
    setLoadingStats(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!selectedArticle) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeStats();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedArticle, closeStats]);

  const loadArticleStats = async (article: PublishedArticle) => {
    setSelectedArticle(article);
    setReadingStats(null);
    setError('');
    setLoadingStats(true);
    try {
      const { data } = await adminApi.get<ArticleReadingStats>(`/api/admin/stats/reading/${article.id}`);
      setReadingStats(data);
    } catch (err) {
      console.error('Failed to load article reading stats:', err);
      setError('阅读统计加载失败，请稍后重试');
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-7rem)]">
      <div
        className={`space-y-6 transition-all duration-500 ease-out ${
          selectedArticle ? 'scale-[0.97] blur-sm opacity-60 pointer-events-none select-none' : 'scale-100 blur-0 opacity-100'
        }`}
        aria-hidden={selectedArticle ? true : undefined}
      >
        <div className="flex items-center gap-3 animate-fade-in">
          <button
            type="button"
            onClick={() => navigate('/admin/stats')}
            className="w-9 h-9 rounded-xl glass flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand/30 transition-all"
            aria-label="返回数据统计"
          >
            <IconArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">全部文章阅读统计</h1>
            <p className="text-sm text-gray-400 mt-1">选择一篇已发布文章，查看阅读时长对比</p>
          </div>
        </div>

        <section className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                <IconBook size={18} className="text-gray-400 mr-2 inline" />已发布文章
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">共 {articles.length} 篇，点击文章加载阅读时长饼图</p>
            </div>
          </div>

          {loadingArticles ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-[78px] rounded-2xl bg-white/20 dark:bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-like">{error}</div>
          ) : articles.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">暂无已发布文章</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {articles.map(article => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => void loadArticleStats(article)}
                  className="group text-left p-4 rounded-2xl border border-black/5 dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] hover:bg-brand/[0.04] hover:border-brand/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-text-primary dark:text-white/90 line-clamp-2 group-hover:text-brand transition-colors">
                        {article.title || '未命名'}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-2">
                        预计 {article.reading_time || 1} 分钟
                        {article.published_at
                          ? ` · ${new Date(article.published_at).toLocaleDateString('zh-CN')}`
                          : ''}
                      </p>
                    </div>
                    <span className="w-7 h-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0 group-hover:bg-brand group-hover:text-white group-hover:translate-x-0.5 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-white/20 dark:bg-black/45 backdrop-blur-md animate-fade-in"
          onMouseDown={event => {
            if (event.currentTarget === event.target) closeStats();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedArticle.title} 阅读统计`}
        >
          <div className="relative w-full max-w-md animate-fade-in">
            <button
              type="button"
              onClick={closeStats}
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full glass flex items-center justify-center text-gray-400 hover:text-like hover:scale-105 transition-all"
              aria-label="关闭阅读统计"
            >
              ×
            </button>

            {loadingStats ? (
              <div className="glass rounded-3xl min-h-[410px] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                <p className="text-sm text-gray-400">正在加载阅读统计...</p>
              </div>
            ) : error ? (
              <div className="glass rounded-3xl min-h-[260px] flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sm text-like">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadArticleStats(selectedArticle)}
                  className="px-5 py-2 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-xl transition-all"
                >
                  重新加载
                </button>
              </div>
            ) : readingStats ? (
              <ArticleReadingCard article={readingStats} className="rounded-3xl px-7 py-7" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
