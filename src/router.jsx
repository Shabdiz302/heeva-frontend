import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);
const BASE_URL = import.meta.env.BASE_URL || '/';
const BASE_PREFIX = BASE_URL === '/' ? '' : BASE_URL.replace(/\/$/, '');

function stripBase(pathname) {
  pathname = pathname.replace(/\/+$/, '') || '/';
  if (BASE_PREFIX && (pathname === BASE_PREFIX || pathname.startsWith(`${BASE_PREFIX}/`))) {
    const remainder = pathname.slice(BASE_PREFIX.length);
    return remainder || '/';
  }
  return pathname || '/';
}

function initialPath() {
  const params = new URLSearchParams(window.location.search);
  const redirectedRoute = params.get('__gh_pages_route');
  if (redirectedRoute) {
    const restored = new URL(redirectedRoute, window.location.origin);
    const routePath = stripBase(restored.pathname);
    const publishedPath = `${BASE_URL}${routePath.replace(/^\/+/, '')}`;
    window.history.replaceState({}, '', `${publishedPath}${restored.search}${restored.hash}`);
    return routePath;
  }
  return stripBase(window.location.pathname);
}

function publishedUrl(to) {
  const route = to.startsWith('/') ? to.slice(1) : to;
  return `${BASE_URL}${route}`;
}

export function RouterProvider({ children }) {
  const [pathname, setPathname] = useState(initialPath);

  useEffect(() => {
    const onPopState = () => setPathname(stripBase(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to) => {
    const url = new URL(publishedUrl(to), window.location.origin);
    if (url.origin !== window.location.origin) return;
    const routePath = stripBase(url.pathname);
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setPathname(routePath);
    if (url.hash) {
      window.setTimeout(() => document.getElementById(url.hash.slice(1))?.scrollIntoView(), 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useRouter must be used inside RouterProvider');
  return router;
}

export function Link({ to, onClick, children, ...props }) {
  const href = to.startsWith('/') ? publishedUrl(to) : to;
  const { navigate } = useRouter();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || props.target === '_blank'
        ) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
