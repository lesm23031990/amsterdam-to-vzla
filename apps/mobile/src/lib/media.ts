const DEFAULT_API_URL = 'http://localhost:3001';

/**
 * Convierte rutas relativas del backend (`/uploads/comments/...`) en URLs
 * absolutas usando el origen de la API. Las URLs absolutas y los data URLs
 * se devuelven sin cambios.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  apiUrl: string | null | undefined = process.env.EXPO_PUBLIC_API_URL,
): string | null {
  if (!url) return null;

  const value = url.trim();
  if (!value) return null;

  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  const base = (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}
