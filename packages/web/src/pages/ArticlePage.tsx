import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ArticleWithTags } from '@bubbleblog/shared';
import ImageCarousel from '@/components/ImageCarousel';
import OrganicHeading from '@/components/OrganicHeading';
import BackToTop from '@/components/BackToTop';
import { IconArrowLeft, IconCalendar, IconClock, IconTag, IconCopy, IconCheck } from '@/components/Icons';
import LikeButton from '@/components/LikeButton';
import { enhanceCodeBlocks } from '@/lib/markdown';
import { useObfuscatedImage } from '@/hooks/useObfuscatedImage';


function getFingerprint(): string {
  const stored = sessionStorage.getItem('_fp');
  if (stored) return stored;
  const fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem('_fp', fp);
  return fp;
}



export default function ArticlePage() {
  const articleCornerBanner = useObfuscatedImage('/article-corner-banner.dat');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleWithTags | null>(null);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const trackedRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 40;
      setScrolled(prev => prev !== isScrolled ? isScrolled : prev);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    startTimeRef.current = Date.now();
    trackedRef.current = false;
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

  // Enhance code blocks after content renders
  useEffect(() => {
    if (article && contentRef.current) {
      enhanceCodeBlocks(contentRef.current);
    }
  }, [article?.content_html]);

  // Track page view + reading time
  useEffect(() => {
    if (!article) return;
    const fp = getFingerprint();
    const articleId = (article as any).id;

    if (!trackedRef.current && articleId) {
      trackedRef.current = true;
      fetch('/api/track/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, fingerprint: fp }),
      }).catch(() => {});
    }

    const sendReadingTime = () => {
      if (!articleId) return;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration < 3) return;
      const body = JSON.stringify({ article_id: articleId, fingerprint: fp, duration_seconds: duration });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track/reading', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track/reading', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => { if (document.visibilityState === 'hidden') sendReadingTime(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', sendReadingTime);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', sendReadingTime);
      sendReadingTime();
    };
  }, [article]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#f8f9fc] dark:bg-black">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-[#f8f9fc] dark:bg-black">
        <p className="text-gray-400">文章不存在</p>
        <Link to="/" className="text-link hover:underline text-sm inline-flex items-center gap-1"><IconArrowLeft size={14} />返回首页</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fc] dark:bg-black min-h-screen rounded-[32px] md:rounded-[40px] mt-5 mb-8 shadow-lg border border-black/[0.03] dark:border-white/[0.05]">
      <article className="max-w-[88vw] mx-auto px-4 py-6">
        {/* Back button */}
        <div className="mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-link transition-colors">
            <IconArrowLeft size={14} /> 返回
          </button>
        </div>

        <div className="relative z-20 -mb-4">
          <ImageCarousel images={carouselImages} />
        </div>

        <div className="bg-white dark:bg-[#0d0d0d] rounded-3xl px-6 sm:px-14 py-10 relative z-10 shadow-sm">
          <OrganicHeading level="h1">{article.title}</OrganicHeading>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mb-8 text-xs text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1"><IconCalendar size={13} /> {article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
            <span className="inline-flex items-center gap-1"><IconClock size={13} /> {article.reading_time} min</span>
            <span className="inline-flex items-center gap-1">
              <IconTag size={13} /> {article.tags.map(t => (
                <Link key={t.id} to={`/tag/${t.slug}`} className="text-link hover:underline ml-1">{t.name}</Link>
              ))}
            </span>
          </div>

          <div
            ref={contentRef}
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[15px] leading-relaxed text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: article.content_html }}
          />

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-black/5 dark:border-white/5">
            {article.prev_slug ? (
              <Link to={`/article/${article.prev_slug}`} className="text-xs text-gray-400 hover:text-link transition-colors inline-flex items-center gap-1">
                <IconArrowLeft size={12} />上一篇
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

      {/* Decorative Corner Mascot Banner */}
      <div className="fixed bottom-0 right-0 z-40 w-24 sm:w-28 md:w-32 h-auto pointer-events-none select-none animate-fade-in">
        {articleCornerBanner && (
          <img
            src={articleCornerBanner}
            alt=""
            className="w-full h-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  );
}
