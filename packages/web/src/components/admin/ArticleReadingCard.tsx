import DonutChart from '@/components/charts/DonutChart';

export interface ArticleReadingStats {
  article_id: number;
  title: string;
  slug: string;
  estimated_minutes: number;
  actual_avg_seconds: number;
  actual_avg_minutes: number;
  session_count: number;
  likes_count: number;
}

interface ArticleReadingCardProps {
  article: ArticleReadingStats;
  className?: string;
}

export default function ArticleReadingCard({ article, className = '' }: ArticleReadingCardProps) {
  return (
    <div className={`glass rounded-2xl p-5 flex flex-col items-center card-tilt animate-fade-in ${className}`}>
      <h3 className="text-sm font-bold text-text-primary dark:text-white text-center leading-snug mb-4 line-clamp-2">
        {article.title || '未命名'}
      </h3>

      <DonutChart
        estimatedMinutes={article.estimated_minutes}
        actualAvgMinutes={article.actual_avg_minutes}
        sessionCount={article.session_count}
        size={200}
      />

      <div className="flex gap-4 mt-3 text-center">
        <div>
          <div className="text-lg font-extrabold text-brand">{article.estimated_minutes}</div>
          <div className="text-[10px] text-gray-400">预计(分钟)</div>
        </div>
        <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
        <div>
          <div className="text-lg font-extrabold text-link">
            {article.actual_avg_minutes > 0 ? article.actual_avg_minutes.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-gray-400">实际(分钟)</div>
        </div>
        <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
        <div>
          <div className="text-lg font-extrabold text-like">{article.session_count}</div>
          <div className="text-[10px] text-gray-400">阅读次数</div>
        </div>
        <div className="w-px bg-black/5 dark:bg-white/[0.06]" />
        <div>
          <div className="text-lg font-extrabold text-red-500">{article.likes_count || 0}</div>
          <div className="text-[10px] text-gray-400">点赞数</div>
        </div>
      </div>
    </div>
  );
}
