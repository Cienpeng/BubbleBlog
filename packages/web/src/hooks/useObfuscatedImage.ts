import { useState, useEffect } from 'react';

const decodedImageCache = new Map<string, Promise<string>>();
const decodedObjectUrls = new Set<string>();

function loadObfuscatedImage(url: string): Promise<string> {
  const cached = decodedImageCache.get(url);
  if (cached) return cached;

  const pending = fetch(url)
    .then(async response => {
      if (!response.ok) throw new Error(`Failed to fetch obfuscated image: ${response.statusText}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      bytes.reverse();
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      decodedObjectUrls.add(objectUrl);
      return objectUrl;
    })
    .catch(error => {
      decodedImageCache.delete(url);
      throw error;
    });

  decodedImageCache.set(url, pending);
  return pending;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    decodedObjectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
    decodedObjectUrls.clear();
    decodedImageCache.clear();
  });
}

export function useObfuscatedImage(url: string): string {
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    let active = true;
    loadObfuscatedImage(url)
      .then(objectUrl => {
        if (active) setImageSrc(objectUrl);
      })
      .catch(err => console.error('Failed to load obfuscated image:', err));

    return () => {
      active = false;
    };
  }, [url]);

  return imageSrc;
}
