import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ArticleListItem } from '@bubbleblog/shared';
import { IconCalendar, IconClock } from './Icons';

interface ArticleCardProps {
  article: ArticleListItem;
  variant: 'feature' | 'normal' | 'compact';
  rotation: number; // Ignored for alignment, kept for TS compatibility
  style?: React.CSSProperties;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: (hovered: boolean) => void;
}

export default function ArticleCard({ article, variant, style, isHovered, isDimmed, onHover }: ArticleCardProps) {
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
    feature: 'p-7 rounded-[32px]',
    normal: 'p-6 rounded-[28px]',
    compact: 'p-5 rounded-[22px]',
  };

  // Completely flat, clean bento scale hover animation without rotation shakes
  const cardTransform = isHovered 
    ? 'scale(1.02) translateY(-4px)' 
    : 'scale(1) translateY(0)';

  return (
    <div
      className={`glass cursor-pointer ${sizeClasses[variant]} ${
        isHovered
          ? 'shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.45)] border-black/[0.1] dark:border-white/[0.12]'
          : isDimmed
            ? 'opacity-70'
            : ''
      } ${ripple ? 'ripple-effect' : ''} transition-all duration-300 relative flex flex-col justify-between`}
      style={{
        transform: cardTransform,
        zIndex: isHovered ? 10 : 0,
        ...style,
      }}
      onClick={handleClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div>
        {/* Article tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light"
            >
              {tag.name}
            </span>
          ))}
        </div>

        <h3
          className={`font-black text-text-primary dark:text-white leading-tight mb-2.5 transition-colors duration-300 ${
            isHovered ? 'text-brand dark:text-brand-light' : ''
          } ${
            variant === 'feature' ? 'text-xl sm:text-[22px]' : variant === 'normal' ? 'text-base sm:text-[17px]' : 'text-sm sm:text-[15px]'
          }`}
        >
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
            {article.excerpt}
          </p>
        )}
      </div>

      {/* Card Footer with Inline Metadata & Icons */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-2 border-t border-black/[0.04] dark:border-white/[0.04] pt-2.5">
        <div className="flex items-center gap-1.5">
          <IconCalendar size={11} className="text-gray-400/80 dark:text-gray-500/80" />
          <span>
            {article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconClock size={11} className="text-gray-400/80 dark:text-gray-500/80" />
          <span>{article.reading_time} min read</span>
        </div>
      </div>
    </div>
  );
}
