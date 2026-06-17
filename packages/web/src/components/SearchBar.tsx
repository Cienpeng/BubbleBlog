import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconClose } from './Icons';

export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, navigate]);

  return (
    <form onSubmit={submit} className="w-full max-w-2xl mx-auto">
      <div className="glass rounded-[24px] flex items-center px-5 h-12">
        <IconSearch size={17} className="text-gray-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索文章..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary dark:text-white placeholder-gray-400"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
            <IconClose size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
