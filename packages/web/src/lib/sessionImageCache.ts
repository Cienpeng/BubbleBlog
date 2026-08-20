const SESSION_PARAM = '__bubbleblog_image_session';
const SERVICE_WORKER_URL = '/session-image-sw.js?v=2';
const randomToken = globalThis.crypto?.randomUUID?.().replace(/-/g, '')
  ?? Math.random().toString(36).slice(2);
const sessionId = `${Date.now().toString(36)}-${randomToken}`;
const rewrittenUrls = new Map<string, string>();
const rewrittenHtml = new Map<string, string>();
const retainedDecodedImages = new Map<string, HTMLImageElement>();
const MAX_RETAINED_DECODED_IMAGES = 10;

let cacheEnabled = false;
let initialization: Promise<void> | null = null;

function isExpectedController(): boolean {
  const controllerUrl = navigator.serviceWorker.controller?.scriptURL;
  return controllerUrl === new URL(SERVICE_WORKER_URL, window.location.href).href;
}

function waitForExpectedController(timeoutMs: number): Promise<void> {
  if (isExpectedController()) return Promise.resolve();

  return new Promise(resolve => {
    const timeout = window.setTimeout(done, timeoutMs);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    function handleControllerChange() {
      if (isExpectedController()) done();
    }

    function done() {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve();
    }
  });
}

/**
 * Starts a page-lifetime image cache before React mounts. Each full reload gets
 * a new session id, while SPA route changes keep using the same Cache API bucket.
 */
export function initializeSessionImageCache(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    try {
      await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Service worker activation timed out')), 1500);
        }),
      ]);
      await waitForExpectedController(1500);
      cacheEnabled = isExpectedController();
    } catch (error) {
      // Images still work through their original URLs when service workers are
      // unavailable (HTTP deployments, private browsing restrictions, etc.).
      console.warn('Session image cache is unavailable:', error);
    }
  })();

  return initialization;
}

/** Adds a marker that the service worker removes before requesting the origin. */
export function getSessionImageUrl(url: string): string {
  if (!cacheEnabled || !url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('__DEFAULT_GRADIENT_')) return url;

  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
    const cacheKey = parsed.toString();
    const existing = rewrittenUrls.get(cacheKey);
    if (existing) return existing;

    parsed.searchParams.set(SESSION_PARAM, sessionId);
    const rewritten = parsed.toString();
    rewrittenUrls.set(cacheKey, rewritten);
    return rewritten;
  } catch {
    return url;
  }
}

/**
 * Keeps a detached image element strongly referenced after it loads. Cache API
 * avoids another download; this pool additionally lets the browser retain the
 * decoded bitmap used by frequently remounted UI images.
 */
export function retainDecodedSessionImage(url: string): string {
  const sessionUrl = getSessionImageUrl(url);
  if (!sessionUrl || typeof Image === 'undefined') return sessionUrl;

  const existing = retainedDecodedImages.get(sessionUrl);
  if (existing) {
    // Refresh insertion order so the most recently used UI images stay alive.
    retainedDecodedImages.delete(sessionUrl);
    retainedDecodedImages.set(sessionUrl, existing);
    return sessionUrl;
  }

  const image = new Image();
  image.decoding = 'async';
  image.addEventListener('load', () => {
    void image.decode().catch(() => undefined);
  }, { once: true });
  image.addEventListener('error', () => {
    if (retainedDecodedImages.get(sessionUrl) === image) {
      retainedDecodedImages.delete(sessionUrl);
    }
  }, { once: true });
  image.src = sessionUrl;
  retainedDecodedImages.set(sessionUrl, image);

  while (retainedDecodedImages.size > MAX_RETAINED_DECODED_IMAGES) {
    const oldest = retainedDecodedImages.keys().next().value;
    if (oldest === undefined) break;
    retainedDecodedImages.delete(oldest);
  }

  return sessionUrl;
}

/** Rewrites article-authored image URLs before the HTML enters the live DOM. */
export function rewriteArticleImageUrls(html: string): string {
  if (!cacheEnabled || !html || typeof document === 'undefined') return html;

  const cacheKey = `${window.location.href}\n${html}`;
  const existing = rewrittenHtml.get(cacheKey);
  if (existing) return existing;

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll<HTMLImageElement>('img[src]').forEach(image => {
    const src = image.getAttribute('src');
    if (src) image.setAttribute('src', getSessionImageUrl(src));
  });

  template.content.querySelectorAll<HTMLVideoElement>('video[poster]').forEach(video => {
    const poster = video.getAttribute('poster');
    if (poster) video.setAttribute('poster', getSessionImageUrl(poster));
  });

  const rewritten = template.innerHTML;
  if (rewrittenHtml.size >= 50) {
    const oldest = rewrittenHtml.keys().next().value;
    if (oldest !== undefined) rewrittenHtml.delete(oldest);
  }
  rewrittenHtml.set(cacheKey, rewritten);
  return rewritten;
}
