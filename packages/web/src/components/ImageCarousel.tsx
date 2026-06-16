import { useState, useEffect, useCallback } from 'react';

const DEFAULT_GRADIENTS: Record<string, string> = {
  __DEFAULT_GRADIENT_1__: 'linear-gradient(135deg, #5DAC81, #3d8b65, #1e5631)',
  __DEFAULT_GRADIENT_2__: 'linear-gradient(135deg, #667eea, #764ba2, #5b3a8c)',
  __DEFAULT_GRADIENT_3__: 'linear-gradient(135deg, #f093fb, #f5576c, #e0444e)',
  __DEFAULT_GRADIENT_4__: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
  __DEFAULT_GRADIENT_5__: 'linear-gradient(135deg, #a8edea, #fed6e3, #e8d5f5)',
};

interface CarouselImage {
  id: number;
  image_url: string | null;
  gradient_key: string | null;
  sort_order: number;
}

interface ImageCarouselProps {
  images: CarouselImage[];
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const items = images.length > 0 ? images : [
    { id: 0, image_url: null, gradient_key: '__DEFAULT_GRADIENT_1__', sort_order: 0 },
    { id: 1, image_url: null, gradient_key: '__DEFAULT_GRADIENT_2__', sort_order: 1 },
    { id: 2, image_url: null, gradient_key: '__DEFAULT_GRADIENT_3__', sort_order: 2 },
    { id: 3, image_url: null, gradient_key: '__DEFAULT_GRADIENT_4__', sort_order: 3 },
    { id: 4, image_url: null, gradient_key: '__DEFAULT_GRADIENT_5__', sort_order: 4 },
  ];

  const next = useCallback(() => setCurrent(c => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, items.length]);

  const item = items[current];
  const bgStyle = item.gradient_key && DEFAULT_GRADIENTS[item.gradient_key]
    ? { background: DEFAULT_GRADIENTS[item.gradient_key] }
    : item.image_url
      ? { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const }
      : { background: DEFAULT_GRADIENTS.__DEFAULT_GRADIENT_1__ };

  return (
    <div className="glass rounded-3xl overflow-hidden relative h-[200px] sm:h-[240px] transition-all duration-500">
      <div className="absolute inset-0 transition-opacity duration-500" style={bgStyle} />
      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white text-xl hover:bg-white/50 transition-all duration-200 z-10">‹</button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white text-xl hover:bg-white/50 transition-all duration-200 z-10">›</button>
        </>
      )}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-5' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
