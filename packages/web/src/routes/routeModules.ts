export type RouteModuleLoader = () => Promise<unknown>;

export const routeModules = {
  home: () => import('@/pages/HomePage'),
  article: () => import('@/pages/ArticlePage'),
  search: () => import('@/pages/SearchPage'),
  tag: () => import('@/pages/TagPage'),
  login: () => import('@/pages/LoginPage'),
  dashboard: () => import('@/pages/admin/Dashboard'),
  articleEditor: () => import('@/pages/admin/ArticleEditor'),
  appearance: () => import('@/pages/admin/Appearance'),
  stats: () => import('@/pages/admin/Stats'),
  articleStats: () => import('@/pages/admin/ArticleStats'),
  profile: () => import('@/pages/admin/Profile'),
  security: () => import('@/pages/admin/Security'),
} satisfies Record<string, RouteModuleLoader>;

export function moduleForPath(pathname: string): RouteModuleLoader | undefined {
  if (pathname === '/') return routeModules.home;
  if (pathname.startsWith('/article/')) return routeModules.article;
  if (pathname === '/search') return routeModules.search;
  if (pathname.startsWith('/tag/')) return routeModules.tag;
  if (pathname === '/login') return routeModules.login;
  if (pathname === '/admin') return routeModules.dashboard;
  if (/^\/admin\/articles\/(?:new|\d+\/edit)$/.test(pathname)) return routeModules.articleEditor;
  if (pathname === '/admin/stats/articles') return routeModules.articleStats;
  if (pathname === '/admin/stats') return routeModules.stats;
  if (pathname === '/admin/appearance') return routeModules.appearance;
  if (pathname === '/admin/profile') return routeModules.profile;
  if (pathname === '/admin/security') return routeModules.security;
  return undefined;
}

export const adminRouteModules = [
  routeModules.dashboard,
  routeModules.stats,
  routeModules.articleStats,
  routeModules.appearance,
  routeModules.security,
  routeModules.profile,
  routeModules.articleEditor,
];

export const publicRouteModules = [
  routeModules.article,
  routeModules.search,
  routeModules.tag,
];

export function preloadModule(loader: RouteModuleLoader | undefined): void {
  if (loader) void loader().catch(() => {});
}
