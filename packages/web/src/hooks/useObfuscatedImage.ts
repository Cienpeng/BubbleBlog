import { useState, useEffect } from 'react';

export function useObfuscatedImage(url: string): string {
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const fetchAndDecode = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch obfuscated image: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        if (!active) return;
        
        const bytes = new Uint8Array(buffer);
        // Reverse the bytes to de-obfuscate
        bytes.reverse();
        
        const blob = new Blob([bytes], { type: 'image/png' });
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setImageSrc(objectUrl);
        }
      } catch (err) {
        console.error('Failed to load obfuscated image:', err);
      }
    };

    fetchAndDecode();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return imageSrc;
}
