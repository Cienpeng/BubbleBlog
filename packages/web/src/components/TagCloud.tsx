import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Tag } from '@bubbleblog/shared';
import GlassCard from './GlassCard';

export default function TagCloud({ tags }: { tags: Tag[] }) {
  const [showAllModal, setShowAllModal] = useState(false);

  const displayedTags = tags.slice(0, 6);

  return (
    <>
      <GlassCard className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          标签
        </h3>
        <div className="flex flex-wrap gap-2">
          {displayedTags.map(tag => (
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

        {tags.length > 6 && (
          <div className="mt-3.5 border-t border-black/[0.04] dark:border-white/[0.04] pt-2.5 flex justify-center">
            <button
              onClick={() => setShowAllModal(true)}
              className="text-xs text-brand hover:text-brand-dark dark:text-brand-light dark:hover:text-brand font-semibold hover:underline flex items-center gap-1.5 focus:outline-none"
            >
              查看全部标签 ({tags.length}) →
            </button>
          </div>
        )}
      </GlassCard>

      {/* Show All Tags Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setShowAllModal(false)} />
          
          <GlassCard className="relative w-full max-w-md p-6 shadow-2xl border border-black/5 dark:border-white/5 z-10 animate-zoom-in">
            {/* Close Button */}
            <button
              onClick={() => setShowAllModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-lg"
              title="关闭"
            >
              ×
            </button>
            
            <h3 className="text-xs font-bold uppercase tracking-widest text-black dark:text-white mb-4">
              全部标签 ({tags.length})
            </h3>
            
            <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {tags.map(tag => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  onClick={() => setShowAllModal(false)}
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
        </div>
      )}
    </>
  );
}
