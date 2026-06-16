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
            className="px-3 py-1 rounded-[20px] text-xs bg-link/8 text-link hover:bg-link/15 dark:bg-link/15 dark:text-blue-300 transition-colors duration-200"
          >
            {tag.name}
            {tag.article_count !== undefined && (
              <span className="ml-1 opacity-50">{tag.article_count}</span>
            )}
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}
