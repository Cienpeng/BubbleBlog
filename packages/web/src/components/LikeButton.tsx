import { useState, useCallback, useEffect } from 'react';
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

  useEffect(() => {
    let active = true;
    const fetchLikeInfo = async () => {
      try {
        const fingerprint = getFingerprint();
        const res = await fetch(`/api/articles/${slug}/likes?fingerprint=${encodeURIComponent(fingerprint)}`);
        const json = await res.json();
        if (json.success && active) {
          setCount(json.data.count);
          setLiked(json.data.liked);
        }
      } catch {
        // Silently fail
      }
    };
    fetchLikeInfo();
    return () => {
      active = false;
    };
  }, [slug]);

  const toggle = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${slug}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      });
      const json = await res.json();
      if (json.success) {
        setCount(json.data.count);
        setLiked(json.data.liked);
      }
    } catch {
      // Silently fail
    }
  }, [slug]);

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-[24px] text-sm font-medium transition-all duration-200 active:scale-95 ${
        liked
          ? 'bg-like/15 border border-like/30 text-like hover:bg-like/20'
          : 'glass text-gray-500 hover:text-like hover:bg-like/5'
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
