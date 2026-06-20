import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import { IconBubble, IconSearch } from './Icons';

interface NavbarProps {
  onSearchClick: () => void;
}

export default function Navbar({ onSearchClick }: NavbarProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = (path: string) =>
    `text-sm transition-all duration-200 font-medium ${
      location.pathname === path
        ? 'text-brand dark:text-brand-light'
        : 'text-gray-800 dark:text-white/90 hover:text-brand dark:hover:text-brand-light'
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 mx-4 mt-3 px-6 py-3 rounded-[40px] transition-all duration-500 ${
        scrolled
          ? 'glass-nav scale-[0.985]'
          : 'glass-nav-clear hover:scale-[1.005]'
      }`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 group">
          <IconBubble className="text-brand transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" size={22} />
          <span className="font-extrabold text-lg bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-transparent">
            BubbleBlog
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className={`${linkClass('/')} hover:scale-105`}>首页</Link>
          <button
            onClick={onSearchClick}
            className={`${linkClass('/search')} hover:scale-105 bg-transparent border-none cursor-pointer inline-flex items-center gap-1`}
          >
            <IconSearch size={15} />
            搜索
          </button>
          {isLoggedIn ? (
            <Link
              to="/admin"
              className={`text-sm px-4 py-1.5 rounded-[20px] transition-all duration-200 hover:scale-105 font-medium ${
                location.pathname.startsWith('/admin')
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-800 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              管理
            </Link>
          ) : null}
          <ThemeToggle />
        </div>

        <div className="sm:hidden flex items-center gap-3">
          <ThemeToggle />
          <button onClick={onSearchClick} className="hover:scale-110 transition-transform">
            <IconSearch size={20} className="text-gray-800 dark:text-white/90" />
          </button>
        </div>
      </div>
    </nav>
  );
}
