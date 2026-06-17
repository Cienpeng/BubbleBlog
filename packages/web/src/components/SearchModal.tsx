import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { SearchResult } from '@bubbleblog/shared';
import { IconSearch } from './Icons';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data || []);
        setSelectedIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      navigate(`/article/${results[selectedIdx].slug}`);
      onClose();
    }
  }, [results, selectedIdx, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
      />

      {/* Search panel */}
      <div
        className="relative mt-[12vh] w-full max-w-xl mx-4 animate-search-in"
      >
        <div className="glass-nav rounded-3xl overflow-hidden shadow-2xl">
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5 dark:border-white/[0.06]">
            <IconSearch size={18} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="搜索文章..."
              className="flex-1 bg-transparent outline-none text-base text-text-primary dark:text-white placeholder-gray-400"
            />
            <kbd
              onClick={onClose}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/[0.06] text-gray-400 font-mono cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400 animate-pulse">
                搜索中...
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                未找到结果
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => { navigate(`/article/${r.slug}`); onClose(); }}
                    className={`w-full text-left px-5 py-3 transition-colors ${
                      i === selectedIdx
                        ? 'bg-brand/10 dark:bg-brand/20'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white line-clamp-1">
                      {r.title}
                    </h4>
                    {r.headline && (
                      <p
                        className="text-xs text-gray-400 mt-0.5 line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: r.headline }}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : !query.trim() ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                输入关键词开始搜索
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes searchIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-search-in {
          animation: searchIn 250ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
      `}</style>
    </div>
  );
}
