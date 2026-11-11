const BASE_URL = import.meta.env.BASE_URL || '/';

/** Resolve a public asset path under Vite's configured base path. */
export function assetUrl(path) {
  const relativePath = String(path).replace(/^\/+/, '');
  return `${BASE_URL}${relativePath}`;
}
