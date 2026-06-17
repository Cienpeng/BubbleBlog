import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ArticleListItem } from '@bubbleblog/shared';

interface ArticleCardProps {
  article: ArticleListItem;
  variant: 'feature' | 'normal' | 'compact';
  rotation: number;
  style?: React.CSSProperties;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: (hovered: boolean) => void;
}

export default function ArticleCard({ article, variant, rotation, style, isHovered, isDimmed, onHover }: ArticleCardProps) {
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

  // Combine rotation with hover effects in style
  const cardTransform = [
    `rotate(${rotation}deg)`,
    isHovered ? 'scale(1.03) translateY(-6px)' : '',
    isDimmed ? 'scale(0.97) translateY(3px)' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`glass cursor-pointer ${sizeClasses[variant]} ${
        isHovered
          ? 'shadow-2xl'
          : isDimmed
            ? 'opacity-40 blur-[1.5px]'
            : ''
      } ${ripple ? 'ripple-effect' : ''} transition-all duration-400 relative`}
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
      <div style={{ transform: `rotate(${-rotation}deg)` }}>
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

        {article.excerpt && (
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3 line-clamp-2">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-auto">
          <span>{article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
          <span>{article.reading_time} min read</span>
        </div>
      </div>
    </div>
  );
}
