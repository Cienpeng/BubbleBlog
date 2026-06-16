import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ArticleWithTags } from '@bubbleblog/shared';
import ReadingProgress from '@/components/ReadingProgress';
import ImageCarousel from '@/components/ImageCarousel';
import OrganicHeading from '@/components/OrganicHeading';
import BackToTop from '@/components/BackToTop';
import LikeButton from '@/components/LikeButton';
import Footer from '@/components/Footer';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleWithTags | null>(null);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.get<ArticleWithTags>(`/api/articles/${slug}`),
      fetch(`/api/articles/${slug}/carousel`).then(r => r.json()).then(d => d.data || []).catch(() => []),
    ])
      .then(([articleData, carouselData]) => {
        setArticle(articleData);
        setCarouselImages(carouselData);
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400">文章不存在</p>
        <Link to="/" className="text-link hover:underline text-sm">← 返回首页</Link>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />

      {/* Sticky back nav with glass effect on scroll */}
      <div className={`sticky top-0 z-40 mx-4 mt-2 px-4 py-2.5 rounded-[30px] transition-all duration-300 ${
        scrolled ? 'glass-nav backdrop-blur-[20px]' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-3 text-sm max-w-[88vw] mx-auto">
          <button onClick={() => navigate(-1)} className="text-lg hover:text-brand transition-colors">←</button>
          <span className="text-gray-400 dark:text-gray-500">BubbleBlog</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-600 dark:text-gray-300 truncate font-medium">{article.title}</span>
        </div>
      </div>

      <article className="max-w-[88vw] mx-auto px-4 py-6">
        {/* Carousel */}
        <div className="relative z-20 -mb-4">
          <ImageCarousel images={carouselImages} />
        </div>

        {/* Article body in glass card */}
        <div className="glass rounded-3xl px-6 sm:px-14 py-10 relative z-10">
          <OrganicHeading level="h1">{article.title}</OrganicHeading>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mb-8 text-xs text-gray-400 dark:text-gray-500">
            <span>📅 {article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
            <span>⏱️ {article.reading_time} min</span>
            <span>
              🏷️ {article.tags.map(t => (
                <Link key={t.id} to={`/tag/${t.slug}`} className="text-link hover:underline ml-1">{t.name}</Link>
              ))}
            </span>
          </div>

          {/* Render server-side HTML content */}
          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[15px] leading-relaxed text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: article.content_html }}
          />

          {/* Article typography overrides */}
          <style>{`
            .prose h2 { font-size: 1.25rem; font-weight: 800; margin-top: 2rem; }
            .prose h3 { font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; }
            .prose pre { background: #161616 !important; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
            .dark .prose pre { background: #0a0a0a !important; }
            .prose pre code { color: #e0e0e0; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; }
            .prose code { background: rgba(0,0,0,0.05); padding: 0.15em 0.4em; border-radius: 0.3em; font-size: 0.85em; }
            .dark .prose code { background: rgba(255,255,255,0.08); }
          `}</style>

          {/* Bottom nav: prev/next + like */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-black/5 dark:border-white/5">
            {article.prev_slug ? (
              <Link to={`/article/${article.prev_slug}`} className="text-xs text-gray-400 hover:text-link transition-colors">
                ← 上一篇
              </Link>
            ) : <span />}
            <LikeButton slug={article.slug} initialCount={0} initialLiked={false} />
            {article.next_slug ? (
              <Link to={`/article/${article.next_slug}`} className="text-xs text-gray-400 hover:text-link transition-colors">
                下一篇 →
              </Link>
            ) : <span />}
          </div>
        </div>
      </article>

      <BackToTop />
      <Footer />
    </>
  );
}
