/**
 * Resuelve URLs de media que llegan del backend.
 *
 * `POST /api/v1/uploads` devuelve rutas relativas (`/uploads/comments/...`)
 * servidas por Express. Si `NEXT_PUBLIC_API_URL` es absoluta (ej.
 * `https://amsterdam-to-vzla-api.onrender.com/api/v1`) hay que anteponer el
 * origen de la API, porque el frontend vive en otro dominio.
 *
 * En la demo de Vercel el backend no está conectado, así que la ruta se
 * devuelve tal cual para no romper el render.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const value = url.trim();
  if (!value) return null;

  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl.startsWith('/')) return value;

  const origin = apiUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
}
