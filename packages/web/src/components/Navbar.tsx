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
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/75 dark:bg-black/75 backdrop-blur-[20px] border-b border-black/[0.05] dark:border-white/[0.08] shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-8 sm:px-12 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center border border-brand/20 transition-all duration-300 group-hover:scale-105 group-hover:bg-brand/15">
            <IconBubble className="text-brand" size={16} />
          </div>
          <span className="font-black text-[17px] tracking-tight text-text-primary dark:text-white">
            Bubble<span className="text-brand dark:text-brand-light">Blog</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            to="/"
            className={`text-sm px-3.5 py-1.5 rounded-full font-medium transition-all duration-300 ${
              location.pathname === '/'
                ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light'
                : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white'
            }`}
          >
            首页
          </Link>
          
          <button
            onClick={onSearchClick}
            className="text-sm px-3.5 py-1.5 rounded-full font-medium text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white transition-all duration-300 flex items-center gap-1.5"
          >
            <IconSearch size={14} className="text-gray-400 dark:text-gray-500" />
            搜索
          </button>
          
          {isLoggedIn && (
            <Link
              to="/admin"
              className={`text-sm px-3.5 py-1.5 rounded-full font-medium transition-all duration-300 ${
                location.pathname.startsWith('/admin')
                  ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white'
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
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
            aria-label="搜索"
          >
            <IconSearch size={18} />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
