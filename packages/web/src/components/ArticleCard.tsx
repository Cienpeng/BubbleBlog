import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ArticleListItem } from '@bubbleblog/shared';

interface ArticleCardProps {
  article: ArticleListItem;
  variant: 'feature' | 'normal' | 'compact';
  rotation: number;
  style?: React.CSSProperties;
}

export default function ArticleCard({ article, variant, rotation, style }: ArticleCardProps) {
  const navigate = useNavigate();
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => {
      setRipple(false);
      navigate(`/article/${article.slug}`);
    }, 150);
  };

  const sizeClasses = {
    feature: 'col-span-2 p-7 rounded-[32px]',
    normal: 'p-6 rounded-[28px]',
    compact: 'p-5 rounded-[22px]',
  };

  return (
    <div
      className={`glass card-tilt cursor-pointer ${sizeClasses[variant]} ${ripple ? 'ripple-effect' : ''}`}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="flex flex-wrap gap-1.5 mb-2">
        {article.tags.slice(0, 3).map(tag => (
          <span key={tag.id} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
            {tag.name}
          </span>
        ))}
      </div>

      <h3 className={`font-extrabold text-text-primary dark:text-white leading-tight mb-2 ${
        variant === 'feature' ? 'text-[22px]' : variant === 'normal' ? 'text-[17px]' : 'text-[15px]'
      }`}>
        {article.title}
      </h3>

      {variant !== 'compact' && article.excerpt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
          {article.excerpt}
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-auto">
        <span>{article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
        <span>{article.reading_time} min read</span>
      </div>
    </div>
  );
}
