import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconArrowLeft, IconTrash, IconSave, IconRocket } from '@/components/Icons';
import { adminApi } from '@/lib/api';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({ breaks: true, gfm: true });

interface Article {
  id: number;
  title: string;
  slug: string;
  content_md: string;
  content_html: string;
  excerpt: string;
  cover_image: string | null;
  status: 'draft' | 'published';
  reading_time: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: { id: number; name: string; slug: string }[];
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { updateToken } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();

  // Fetch existing article
  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const { data, newToken } = await adminApi.get<Article>(`/api/articles/${id}/preview`);
        if (newToken) updateToken(newToken);
        setArticle(data);
        setTitle(data.title || '');
        setMarkdown(data.content_md || '');
        setTags(data.tags?.map(t => t.name) || []);
      } catch (err) {
        setError('加载文章失败');
      }
    })();
  }, [id, isNew, updateToken]);

  // Live preview with debounce
  useEffect(() => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      try {
        if (markdown.trim()) {
          const html = marked.parse(markdown) as string;
          setPreviewHtml(html);
        } else {
          setPreviewHtml('');
        }
      } catch {
        setPreviewHtml('<p class="text-red-500">Markdown 解析错误</p>');
      }
    }, 300);
    return () => clearTimeout(previewTimer.current);
  }, [markdown]);

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        // Create new article
        const { data, newToken } = await adminApi.post<Article>('/api/articles/upload', {
          content_md: markdown,
          tags,
        });
        if (newToken) updateToken(newToken);
        setArticle(data);
        setSavedAt(new Date());
        // Replace URL with the new article ID
        navigate(`/admin/articles/${data.id}/edit`, { replace: true });
      } else {
        // Update existing
        const { data, newToken } = await adminApi.put<Article>(`/api/articles/${id}`, {
          title,
          content_md: markdown,
          tags,
        });
        if (newToken) updateToken(newToken);
        setArticle(data);
        setSavedAt(new Date());
      }
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [isNew, id, title, markdown, tags, navigate, updateToken]);

  const toggleStatus = useCallback(async () => {
    if (!article) return;
    setSaving(true);
    try {
      const endpoint = article.status === 'draft'
        ? `/api/articles/${article.id}/publish`
        : `/api/articles/${article.id}/unpublish`;
      const { data, newToken } = await adminApi.put<Article>(endpoint);
      if (newToken) updateToken(newToken);
      setArticle(data);
      setSavedAt(new Date());
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  }, [article, updateToken]);

  const handleDelete = useCallback(async () => {
    if (!article) return;
    if (!confirm(`确定删除「${article.title || '未命名'}」？不可撤销。`)) return;
    try {
      const { newToken } = await adminApi.delete(`/api/articles/${article.id}`);
      if (newToken) updateToken(newToken);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  }, [article, navigate, updateToken]);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [save]);

  return (
    <div className="animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-text-primary dark:text-white/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors text-sm"
          >
            <IconArrowLeft size={18} />
          </button>
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="文章标题..."
              className="bg-transparent outline-none text-lg font-bold text-text-primary dark:text-white placeholder-gray-300 dark:placeholder-gray-600 w-64 lg:w-96"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {article && (
            <span className={`font-semibold px-2 py-1 rounded-full ${
              article.status === 'published'
                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
            }`}>
              {article.status === 'published' ? '已发布' : '草稿'}
            </span>
          )}
          {savedAt && (
            <span>已保存 {savedAt.toLocaleTimeString('zh-CN')}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-like/10 text-like text-sm">{error}</div>
      )}

      {/* Editor + Preview split */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Markdown editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Markdown</div>
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder={`# 开始写作...\n\n支持 Markdown 语法\n\n\`\`\`ts\nconst hello = 'world';\n\`\`\`\n\n> 引用文字\n\n- 列表项`}
            className="flex-1 w-full resize-none rounded-2xl p-5 font-mono text-sm leading-relaxed bg-white/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] outline-none focus:border-brand/30 transition-colors text-text-primary dark:text-white/90 placeholder-gray-300 dark:placeholder-gray-600"
          />
        </div>

        {/* Live preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">预览</div>
          <div className="flex-1 rounded-2xl p-5 overflow-y-auto bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.06]">
            {previewHtml ? (
              <article
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-gray-300 dark:text-gray-600 text-sm italic">预览将实时显示在这里...</p>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-gray-400">标签:</span>
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
              {t}
              <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-like transition-colors">×</button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const name = tagInput.trim();
                if (name && !tags.includes(name)) setTags(prev => [...prev, name]);
                setTagInput('');
              }
            }}
            placeholder="输入标签后回车添加"
            className="w-44 px-3 py-1 rounded-xl bg-transparent border border-black/5 dark:border-white/[0.06] outline-none text-xs text-text-primary dark:text-white/80 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand/30 transition-colors"
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          {article && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-like hover:bg-like/5 transition-colors"
            >
              <IconTrash size={13} /> 删除
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-sm font-medium text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : <><IconSave size={14} /> 保存草稿</>}
          </button>
          {article && (
            <button
              onClick={toggleStatus}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                article.status === 'draft'
                  ? 'bg-brand text-white hover:bg-brand-dark shadow-md shadow-brand/25'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {article.status === 'draft' ? <><IconRocket size={14} /> 发布</> : '取消发布'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
