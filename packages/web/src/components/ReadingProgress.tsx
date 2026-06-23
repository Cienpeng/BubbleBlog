import { useState, useEffect } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docH = document.documentElement.scrollHeight - window.innerHeight;
          if (docH > 0) {
            setProgress(Math.min(100, (window.scrollY / docH) * 100));
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-black/5 dark:bg-white/5">
      <div
        className="h-full bg-gradient-to-r from-brand via-brand-light to-brand transition-[width] duration-150 ease-out rounded-r-sm"
        style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(93,172,129,0.4)' }}
      />
    </div>
  );
}
