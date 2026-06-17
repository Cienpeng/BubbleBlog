import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconUpload, IconPlus, IconArticles } from '@/components/Icons';
import { adminApi } from '@/lib/api';

interface Article {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  reading_time: number;
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

  const fetchData = useCallback(async () => {
    try {
      const { data, newToken } = await adminApi.get<Article[]>('/api/articles/admin/all');
      if (newToken) updateToken(newToken);

      const all = data || [];
      setArticles(all);
      setStats({
        drafts: all.filter(a => a.status === 'draft').length,
        published: all.filter(a => a.status === 'published').length,
        totalLikes: 0, // We'll add a likes count endpoint later
      });
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(article => (
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
                <span className="text-[11px] text-gray-400">
                  {formatDate(article.published_at || article.updated_at)}
                </span>
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
