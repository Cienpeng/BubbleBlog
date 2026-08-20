import { useEffect } from 'react';
import { getSessionImageUrl, retainDecodedSessionImage } from '@/lib/sessionImageCache';

/**
 * Returns the session-cached URL and keeps one decoded image element alive for
 * the page lifetime so route remounts do not repeatedly decode large images.
 */
export function useSessionImage(url: string): string {
  const sessionUrl = url ? getSessionImageUrl(url) : '';

  useEffect(() => {
    if (url) retainDecodedSessionImage(url);
  }, [url]);

  return sessionUrl;
}
