/**
 * NAFAS — Base Path Resolution Helper
 * Ensures assets, iframes, and routes work seamlessly across:
 * - Local development (http://localhost:3000/)
 * - GitHub Pages deployment (https://<user>.github.io/nafas-iraq/)
 */

export function getBasePath(): string {
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  if (process.env.DEPLOY_TARGET === 'gh-pages') {
    return '/nafas-iraq';
  }
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/nafas-iraq')) {
      return '/nafas-iraq';
    }
  }
  return '';
}

export function getAssetUrl(path: string): string {
  const base = getBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
