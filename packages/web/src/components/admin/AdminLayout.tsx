import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconBubble, IconHome } from '@/components/Icons';
import CommandPalette from './CommandPalette';
import ThemeToggle from '@/components/ThemeToggle';


const TABS = [
  { path: '/admin', label: '文章管理', exact: true },
  { path: '/admin/stats', label: '数据统计', exact: false },
  { path: '/admin/appearance', label: '外观设置', exact: false },
  { path: '/admin/security', label: '安全中心', exact: false },
  { path: '/admin/profile', label: '个人资料', exact: false },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-black transition-colors">
      <header className="sticky top-0 z-30 glass-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-[21px] font-black text-text-primary dark:text-white tracking-tight hover:opacity-70 transition-opacity"
            >
              <IconBubble size={22} className="text-brand" />
              BubbleBlog
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              {TABS.map(tab => {
                const isActive = tab.exact
                  ? location.pathname === tab.path
                  : location.pathname.startsWith(tab.path);
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand'
                        : 'text-gray-500 dark:text-white/40 hover:text-text-primary dark:hover:text-white/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 dark:text-white/40 hover:text-text-primary dark:hover:text-white/70 transition-colors"
            >
              <IconHome size={14} />
              前台
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 dark:text-white/40 hover:text-like transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6">
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  );
}
