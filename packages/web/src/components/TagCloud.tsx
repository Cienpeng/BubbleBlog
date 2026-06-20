import { Link } from 'react-router-dom';
import type { Tag } from '@bubbleblog/shared';
import GlassCard from './GlassCard';

export default function TagCloud({ tags }: { tags: Tag[] }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        标签
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Link
            key={tag.id}
            to={`/tag/${tag.slug}`}
            className="px-3.5 py-1 rounded-full text-xs font-medium border border-black/[0.04] bg-white/40 dark:border-white/[0.06] dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:text-brand dark:hover:text-brand-light hover:border-brand/30 hover:scale-105 transition-all duration-300 hover:shadow-[0_2px_8px_rgba(93,172,129,0.15)] dark:hover:shadow-[0_2px_8px_rgba(125,217,164,0.1)] flex items-center gap-1.5"
          >
            {tag.name}
            {tag.article_count !== undefined && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-70">
                {tag.article_count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}
