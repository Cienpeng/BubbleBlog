import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = (path: string) =>
    `text-sm transition-colors duration-200 ${
      location.pathname === path
        ? 'text-brand dark:text-brand-light font-semibold'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 mx-4 mt-3 px-6 py-3 rounded-[40px] transition-all duration-300 ${
        scrolled
          ? 'glass-nav backdrop-blur-[20px]'
          : 'bg-white/30 dark:bg-white/[0.02] backdrop-blur-[12px] border border-white/50 dark:border-white/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🫧</span>
          <span className="font-extrabold text-lg bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-transparent">
            BubbleBlog
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className={linkClass('/')}>首页</Link>
          <Link to="/search" className={linkClass('/search')}>搜索</Link>
          <Link to="/login" className={`text-sm px-4 py-1.5 rounded-[20px] transition-all duration-200 ${
            location.pathname === '/login'
              ? 'bg-brand/10 text-brand font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
          }`}>
            登录
          </Link>
          <ThemeToggle />
        </div>

        <div className="sm:hidden flex items-center gap-3">
          <ThemeToggle />
          <button className="text-xl">☰</button>
        </div>
      </div>
    </nav>
  );
}
