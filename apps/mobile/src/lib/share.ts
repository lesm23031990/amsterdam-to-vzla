export const SHARE_BRAND = 'Amsterdam Frozen Foods';
export const DEFAULT_WEB_URL = 'https://amsterdam-to-vzla.vercel.app';

export function webBaseUrl(raw: string | null | undefined = process.env.EXPO_PUBLIC_WEB_URL): string {
  const value = (raw || DEFAULT_WEB_URL).trim().replace(/\/+$/, '');
  return value.length > 0 ? value : DEFAULT_WEB_URL;
}

/** Enlace público del detalle de producto en la web. */
export function productUrl(productId: string, baseUrl?: string | null): string {
  return `${webBaseUrl(baseUrl)}/products/${encodeURIComponent(productId)}`;
}

/** Texto que se comparte por WhatsApp / hoja nativa. */
export function buildShareMessage(name: string, price: string, url: string): string {
  const header = `¡Mira este producto en ${SHARE_BRAND}!`;
  const body = price ? `${name} — ${price}` : name;
  return `${header}\n${body}\n${url}`;
}

/** Deep link de WhatsApp que funciona fuera de la app (web). */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
