import { useTheme } from '@/hooks/useTheme';
import { IconSun, IconMoon } from './Icons';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/10"
      aria-label={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
    >
      {theme === 'light' ? (
        <IconMoon size={17} className="text-gray-700" />
      ) : (
        <IconSun size={17} className="text-yellow-400" />
      )}
    </button>
  );
}
