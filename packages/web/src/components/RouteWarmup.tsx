import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  adminRouteModules,
  moduleForPath,
  preloadModule,
  publicRouteModules,
  routeModules,
  type RouteModuleLoader,
} from '@/routes/routeModules';

interface NavigatorConnection {
  saveData?: boolean;
  effectiveType?: string;
}

function canWarmUpInBackground(): boolean {
  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}

function idleWarmUp(loaders: RouteModuleLoader[]): () => void {
  let cancelled = false;
  const load = () => {
    if (cancelled || !canWarmUpInBackground()) return;
    // Start in order and yield between imports so route warming never competes
    // with the page's critical rendering work.
    let index = 0;
    const next = () => {
      if (cancelled || index >= loaders.length) return;
      preloadModule(loaders[index++]);
      window.setTimeout(next, 80);
    };
    next();
  };

  let timeoutId: number | undefined;
  let idleId: number | undefined;
  const idleApi = window as unknown as {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (idleApi.requestIdleCallback) {
    idleId = idleApi.requestIdleCallback(load, { timeout: 1800 });
  } else {
    timeoutId = window.setTimeout(load, 700);
  }

  return () => {
    cancelled = true;
    if (idleId !== undefined) idleApi.cancelIdleCallback?.(idleId);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  };
}

export default function RouteWarmup() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return idleWarmUp(adminRouteModules);
    if (pathname === '/login') return idleWarmUp([routeModules.dashboard]);
    return idleWarmUp(publicRouteModules);
  }, [pathname]);

  useEffect(() => {
    const preloadLinkedRoute = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.origin !== window.location.origin) return;
      preloadModule(moduleForPath(link.pathname));
    };

    document.addEventListener('pointerover', preloadLinkedRoute, { passive: true });
    document.addEventListener('focusin', preloadLinkedRoute);
    document.addEventListener('touchstart', preloadLinkedRoute, { passive: true });
    return () => {
      document.removeEventListener('pointerover', preloadLinkedRoute);
      document.removeEventListener('focusin', preloadLinkedRoute);
      document.removeEventListener('touchstart', preloadLinkedRoute);
    };
  }, []);

  return null;
}
