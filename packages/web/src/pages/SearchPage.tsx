import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { SearchResult } from '@bubbleblog/shared';
import SearchBar from '@/components/SearchBar';
import Footer from '@/components/Footer';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    api.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SearchBar initialQuery={query} />

      <div className="mt-8">
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse py-12">搜索中...</div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">未找到结果</p>
            <p className="text-gray-400 text-sm mt-2">试试其他关键词？</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(r => (
              <Link key={r.id} to={`/article/${r.slug}`} className="block glass rounded-2xl p-5 card-tilt">
                <h3 className="font-bold text-text-primary dark:text-white mb-1">{r.title}</h3>
                {r.headline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: r.headline }} />
                )}
                <span className="text-[10px] text-gray-400 mt-2 block">
                  {r.published_at ? new Date(r.published_at).toLocaleDateString('zh-CN') : ''}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
