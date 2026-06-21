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

  return (
    <nav
      className={`sticky top-0 z-50 mx-4 mt-3 px-6 py-3 rounded-[32px] transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-black/75 backdrop-blur-[20px] border border-black/[0.06] dark:border-white/[0.08] shadow-lg'
          : 'bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.12] shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center border border-brand/20 transition-all duration-300 group-hover:scale-105">
            <IconBubble className="text-brand" size={18} />
          </div>
          <span className="font-black text-[21px] tracking-tight text-text-primary dark:text-white">
            Bubble<span className="text-brand dark:text-brand-light">Blog</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden sm:flex items-center gap-1.5">
          <Link
            to="/"
            className={`text-sm px-4 py-1.5 rounded-full text-black dark:text-white transition-all duration-300 ${
              location.pathname === '/'
                ? 'bg-black/5 dark:bg-white/10 font-bold'
                : 'font-medium hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            首页
          </Link>
          
          <button
            onClick={onSearchClick}
            className="text-sm px-4 py-1.5 rounded-full text-black dark:text-white font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 flex items-center gap-1.5"
          >
            <IconSearch size={14} className="text-black dark:text-white" />
            搜索
          </button>
          
          {isLoggedIn && (
            <Link
              to="/admin"
              className={`text-sm px-4 py-1.5 rounded-full text-black dark:text-white transition-all duration-300 ${
                location.pathname.startsWith('/admin')
                  ? 'bg-black/5 dark:bg-white/10 font-bold'
                  : 'font-medium hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              管理
            </Link>
          )}

          {/* Vertical Divider line */}
          <div className="w-[1px] h-4 bg-black/[0.08] dark:bg-white/[0.08] mx-2" />

          {/* Theme Switcher Toggle */}
          <ThemeToggle />
        </div>

        {/* Mobile Navigation controls */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={onSearchClick}
            className="w-9 h-9 flex items-center justify-center rounded-full text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
            aria-label="搜索"
          >
            <IconSearch size={18} />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
