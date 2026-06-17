import { useState, useCallback } from 'react';
import { IconHeart } from './Icons';

interface LikeButtonProps {
  slug: string;
  initialCount: number;
  initialLiked: boolean;
}

function getFingerprint(): string {
  const nav = window.navigator;
  return `${nav.userAgent}-${screen.width}x${screen.height}`;
}

export default function LikeButton({ slug, initialCount, initialLiked }: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);

  const toggle = useCallback(async () => {
    if (liked) return;
    try {
      const res = await fetch(`/api/articles/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      });
      const json = await res.json();
      if (json.success) {
        setCount(json.data.count);
        setLiked(true);
      }
    } catch {
      // Silently fail
    }
  }, [slug, liked]);

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-[24px] text-sm font-medium transition-all duration-200 ${
        liked
          ? 'bg-like/15 border border-like/30 text-like cursor-default'
          : 'glass text-gray-500 hover:text-like hover:bg-like/5 active:scale-95'
      }`}
    >
      <IconHeart
        size={16}
        className={liked ? 'text-like fill-like' : 'text-gray-400'}
      />
      点赞 ({count})
    </button>
  );
}
