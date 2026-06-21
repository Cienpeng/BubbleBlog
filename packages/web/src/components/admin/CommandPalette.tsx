import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBubble, IconSearch, IconPlus, IconArticles, IconStats, IconAppearance, IconHome, IconUser, IconShield } from '@/components/Icons';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: Command[] = [
    { id: 'new-article', label: '写新文章', shortcut: 'N', Icon: IconPlus, action: () => navigate('/admin/articles/new') },
    { id: 'dashboard', label: '文章管理', shortcut: 'D', Icon: IconArticles, action: () => navigate('/admin') },
    { id: 'stats', label: '数据统计', shortcut: 'S', Icon: IconStats, action: () => navigate('/admin/stats') },
    { id: 'appearance', label: '外观设置', shortcut: 'A', Icon: IconAppearance, action: () => navigate('/admin/appearance') },
    { id: 'security', label: '安全中心', shortcut: 'G', Icon: IconShield, action: () => navigate('/admin/security') },
    { id: 'profile', label: '个人资料', shortcut: 'P', Icon: IconUser, action: () => navigate('/admin/profile') },
    { id: 'home', label: '返回前台', shortcut: 'H', Icon: IconHome, action: () => navigate('/') },
  ];

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(o => !o);
      return;
    }
    if (!open) return;

    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      filtered[selectedIdx].action();
      setOpen(false);
    }
  }, [open, filtered, selectedIdx, navigate]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full glass flex items-center justify-center hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl"
        title="指令面板 (Ctrl+K)"
      >
        <IconBubble size={26} className="text-brand" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/[0.06]">
              <IconSearch size={17} className="text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
                placeholder="搜索指令..."
                className="flex-1 bg-transparent outline-none text-sm text-text-primary dark:text-white placeholder-gray-400"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] text-gray-400 font-mono">
                esc
              </kbd>
            </div>
            <div className="py-2 max-h-[320px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">无匹配指令</div>
              )}
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => { cmd.action(); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    i === selectedIdx
                      ? 'bg-brand/10 dark:bg-brand/20 text-brand'
                      : 'text-text-primary dark:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <cmd.Icon size={16} />
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] text-gray-400 font-mono">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
