import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconUpload, IconPlus, IconArticles, IconHeart } from '@/components/Icons';
import { adminApi } from '@/lib/api';

interface Article {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  reading_time: number;
  likes_count?: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: { id: number; name: string; slug: string }[];
}

interface Stats {
  drafts: number;
  published: number;
  totalLikes: number;
}

export default function Dashboard() {
  const { updateToken } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats>({ drafts: 0, published: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string; slug: string }[]>([]);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data, newToken } = await adminApi.get<Article[]>('/api/articles/admin/all');
      if (newToken) updateToken(newToken);

      const all = data || [];
      setArticles(all);
      const totalLikes = all.reduce((sum, a) => sum + (a.likes_count || 0), 0);
      setStats({
        drafts: all.filter(a => a.status === 'draft').length,
        published: all.filter(a => a.status === 'published').length,
        totalLikes,
      });
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load available tags for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.get<{ id: number; name: string; slug: string }[]>('/api/tags');
        setAvailableTags(data || []);
      } catch (err) {
        console.error('Failed to fetch tags for dashboard:', err);
      }
    })();
  }, []);

  const filteredArticles = articles.filter(article => {
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesTag = tagFilter === 'all' || article.tags?.some(t => t.slug === tagFilter);
    return matchesStatus && matchesTag;
  });

  const togglePublish = useCallback(async (article: Article) => {
    setActionLoading(article.id);
    try {
      if (article.status === 'draft') {
        const { newToken } = await adminApi.put(`/api/articles/${article.id}/publish`);
        if (newToken) updateToken(newToken);
      } else {
        const { newToken } = await adminApi.put(`/api/articles/${article.id}/unpublish`);
        if (newToken) updateToken(newToken);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchData, updateToken]);

  const deleteArticle = useCallback(async (article: Article) => {
    if (!confirm(`确定删除「${article.title}」？此操作不可撤销。`)) return;
    setActionLoading(article.id);
    try {
      const { newToken } = await adminApi.delete(`/api/articles/${article.id}`);
      if (newToken) updateToken(newToken);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchData, updateToken]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/articles/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        if (json.newToken) updateToken(json.newToken);
        navigate(`/admin/articles/${json.data.id}/edit`);
      } else {
        alert(json.error || '上传失败');
      }
    } catch (err) {
      alert('上传失败，请重试');
    }
    e.target.value = '';
  }, [navigate, updateToken]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary dark:text-white">文章管理</h1>
          <p className="text-sm text-gray-400 mt-1">{stats.published} 已发布 · {stats.drafts} 草稿</p>
        </div>
        <div className="flex gap-3">
          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur border border-black/5 dark:border-white/[0.06] text-sm font-medium text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
            <IconUpload size={15} /> 上传 MD
            <input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => navigate('/admin/articles/new')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors shadow-md shadow-brand/25"
          >
            <IconPlus size={15} /> 写新文章
          </button>
        </div>
      </div>

      {/* Stats capsules */}
      <div className="flex gap-4">
        {[
          { label: '草稿', value: stats.drafts, color: 'bg-amber-50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
          { label: '已发布', value: stats.published, color: 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: '总点赞', value: stats.totalLikes, color: 'bg-rose-50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/10', text: 'text-rose-700 dark:text-rose-400' },
        ].map(s => (
          <div key={s.label} className={`flex-1 px-5 py-4 rounded-2xl border ${s.color} backdrop-blur-sm`}>
            <div className={`text-[28px] font-extrabold ${s.text}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      {!loading && articles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.06] backdrop-blur-sm animate-fade-in relative z-30">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">筛选</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (显示 {filteredArticles.length} 篇)
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setStatusDropdownOpen(!statusDropdownOpen);
                  setTagDropdownOpen(false);
                }}
                className="flex items-center justify-between text-xs pl-3.5 pr-8 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 outline-none text-text-primary dark:text-white/80 cursor-pointer font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-w-[96px] relative"
              >
                <span>
                  {statusFilter === 'all' ? '所有状态' : statusFilter === 'published' ? '已发布' : '草稿'}
                </span>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-full min-w-[100px] bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl py-1 shadow-lg z-20 animate-fade-in">
                  {[
                    { value: 'all', label: '所有状态' },
                    { value: 'published', label: '已发布' },
                    { value: 'draft', label: '草稿' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setStatusDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors block ${
                        statusFilter === opt.value
                          ? 'bg-brand/10 text-brand font-bold dark:bg-brand/20 dark:text-brand-light'
                          : 'text-text-primary dark:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tag Filter */}
            <div className="relative" ref={tagDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setTagDropdownOpen(!tagDropdownOpen);
                  setStatusDropdownOpen(false);
                }}
                className="flex items-center justify-between text-xs pl-3.5 pr-8 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 outline-none text-text-primary dark:text-white/80 cursor-pointer font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-w-[100px] relative"
              >
                <span>
                  {tagFilter === 'all' ? '所有标签' : (availableTags.find(t => t.slug === tagFilter)?.name || '所有标签')}
                </span>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${tagDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {tagDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-full min-w-[110px] bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl py-1 shadow-lg z-20 animate-fade-in max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTagFilter('all');
                      setTagDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors block ${
                      tagFilter === 'all'
                        ? 'bg-brand/10 text-brand font-bold dark:bg-brand/20 dark:text-brand-light'
                        : 'text-text-primary dark:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    所有标签
                  </button>
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setTagFilter(tag.slug);
                        setTagDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors block ${
                        tagFilter === tag.slug
                          ? 'bg-brand/10 text-brand font-bold dark:bg-brand/20 dark:text-brand-light'
                          : 'text-text-primary dark:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {(statusFilter !== 'all' || tagFilter !== 'all') && (
              <button
                onClick={() => { setStatusFilter('all'); setTagFilter('all'); }}
                className="text-xs font-semibold text-brand hover:text-brand-dark dark:hover:text-brand-light transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </div>
      )}

      {/* Article grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-white/40 dark:bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <div className="mb-4"><IconArticles size={36} className="text-gray-300 dark:text-gray-600" /></div>
          <p className="text-gray-400 text-sm">还没有文章，写第一篇吧</p>
          <button
            onClick={() => navigate('/admin/articles/new')}
            className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            <IconPlus size={15} /> 写新文章
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="mb-4"><IconArticles size={36} className="text-gray-300 dark:text-gray-600" /></div>
          <p className="text-gray-400 text-sm">没有符合当前筛选条件的文章</p>
          <button
            onClick={() => { setStatusFilter('all'); setTagFilter('all'); }}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-xs font-medium text-brand hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
          >
            重置筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map(article => (
            <div
              key={article.id}
              className="group glass rounded-2xl p-5 card-tilt animate-slide-up"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  article.status === 'published'
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                }`}>
                  {article.status === 'published' ? '已发布' : '草稿'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/admin/articles/${article.id}/edit`)}
                    className="px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-link hover:bg-link/5 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteArticle(article)}
                    className="px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-like hover:bg-like/5 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>

              <Link to={`/admin/articles/${article.id}/edit`} className="block">
                <h3 className="font-bold text-text-primary dark:text-white leading-snug mb-1 line-clamp-2">
                  {article.title || '未命名文章'}
                </h3>
              </Link>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">
                    {formatDate(article.published_at || article.updated_at)}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <IconHeart size={12} className="text-rose-500/80" />
                    <span>{article.likes_count || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {article.tags?.slice(0, 2).map(t => (
                    <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.04] text-gray-400">
                      {t.name}
                    </span>
                  ))}
                  <button
                    onClick={(e) => { e.preventDefault(); togglePublish(article); }}
                    disabled={actionLoading === article.id}
                    className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${
                      article.status === 'draft'
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                    }`}
                  >
                    {actionLoading === article.id ? '...' : article.status === 'draft' ? '发布' : '取消发布'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
