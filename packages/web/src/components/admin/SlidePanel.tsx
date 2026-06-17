import { useEffect, useCallback, type ReactNode } from 'react';
import { IconClose } from '@/components/Icons';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function SlidePanel({ open, onClose, title, children }: SlidePanelProps) {
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-lg h-full glass animate-slide-in-right overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-black/5 dark:border-white/[0.06] bg-white/60 dark:bg-black/40 backdrop-blur-md">
          <h2 className="text-lg font-bold text-text-primary dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-text-primary dark:text-white"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 250ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
      `}</style>
    </div>
  );
}
