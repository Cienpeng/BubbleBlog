const SESSION_PARAM = '__bubbleblog_image_session';
const CACHE_PREFIX = 'bubbleblog-session-images-';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const inFlightImages = new Map();
let lastCacheCleanup = 0;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    cleanupExpiredCaches(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.destination !== 'image') return;

  const markedUrl = new URL(request.url);
  const sessionId = markedUrl.searchParams.get(SESSION_PARAM);
  if (!isValidSessionId(sessionId)) return;

  markedUrl.searchParams.delete(SESSION_PARAM);
  const imageTask = loadSessionImage(request, markedUrl, sessionId);
  event.respondWith(imageTask.then(result => result.response));
  event.waitUntil(Promise.all([
    imageTask.then(result => result.cacheWrite),
    maybeCleanupExpiredCaches(),
  ]));
});

function isValidSessionId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{10,80}$/i.test(value);
}

async function loadSessionImage(markedRequest, originalUrl, sessionId) {
  const cache = await caches.open(`${CACHE_PREFIX}${sessionId}`);
  const networkRequest = new Request(originalUrl.toString(), {
    method: 'GET',
    headers: markedRequest.headers,
    mode: markedRequest.mode,
    credentials: markedRequest.credentials,
    cache: 'reload',
    redirect: 'follow',
    referrer: markedRequest.referrer,
    referrerPolicy: markedRequest.referrerPolicy,
    integrity: markedRequest.integrity,
  });

  const requestKey = `${sessionId}\n${networkRequest.url}`;
  const existingRequest = inFlightImages.get(requestKey);
  if (existingRequest) {
    const existing = await existingRequest;
    return {
      response: existing.response.clone(),
      cacheWrite: existing.cacheWrite,
    };
  }

  const pendingRequest = loadCachedOrRemote(cache, networkRequest)
    .then(result => {
      result.cacheWrite.finally(() => inFlightImages.delete(requestKey));
      return result;
    }, error => {
      inFlightImages.delete(requestKey);
      throw error;
    });
  inFlightImages.set(requestKey, pendingRequest);
  const result = await pendingRequest;
  return {
    response: result.response.clone(),
    cacheWrite: result.cacheWrite,
  };
}

async function loadCachedOrRemote(cache, networkRequest) {
  const cached = await cache.match(networkRequest);
  if (cached) {
    return {
      response: cached,
      cacheWrite: Promise.resolve(),
    };
  }

  const response = await fetch(networkRequest);
  const cacheWrite = isCacheable(response)
    ? cache.put(networkRequest, response.clone()).catch(() => undefined)
    : Promise.resolve();

  // Do not await `cacheWrite` here. The browser can render the response as soon
  // as it arrives while Cache API persistence continues through waitUntil().
  return { response, cacheWrite };
}

function isCacheable(response) {
  return response.ok || response.type === 'opaque';
}

function maybeCleanupExpiredCaches() {
  const now = Date.now();
  if (now - lastCacheCleanup < 60 * 60 * 1000) return Promise.resolve();
  lastCacheCleanup = now;
  return cleanupExpiredCaches(now);
}

async function cleanupExpiredCaches(now = Date.now()) {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => {
    if (!cacheName.startsWith(CACHE_PREFIX)) return Promise.resolve(false);

    const sessionId = cacheName.slice(CACHE_PREFIX.length);
    const timestamp = Number.parseInt(sessionId.split('-')[0], 36);
    if (!Number.isFinite(timestamp) || now - timestamp <= CACHE_MAX_AGE_MS) {
      return Promise.resolve(false);
    }
    return caches.delete(cacheName);
  }));
}
