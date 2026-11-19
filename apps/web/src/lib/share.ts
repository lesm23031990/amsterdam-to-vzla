export const SHARE_BRAND = 'Amsterdam Frozen Foods';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  whatsappUrl: string;
}

/** Texto pre-armado: "Mira este producto en Amsterdam Frozen Foods: [nombre] — [precio]" */
export function buildShareText(title: string, price?: string | null): string {
  const cleanTitle = title.trim();
  const cleanPrice = price?.trim();
  const base = `Mira este producto en ${SHARE_BRAND}: ${cleanTitle}`;
  return cleanPrice ? `${base} — ${cleanPrice}` : base;
}

/** Deep link de WhatsApp con el texto y el link ya escapados. */
export function buildWhatsAppUrl(text: string, url: string): string {
  const message = url ? `${text} ${url}` : text;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildSharePayload({ title, price, url }: { title: string; price?: string | null; url: string }): SharePayload {
  const text = buildShareText(title, price);
  return { title, text, url, whatsappUrl: buildWhatsAppUrl(text, url) };
}
