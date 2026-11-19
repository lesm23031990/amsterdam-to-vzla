import { describe, it, expect } from 'vitest';
import { buildSharePayload, buildShareText, buildWhatsAppUrl, SHARE_BRAND } from '../src/lib/share';

describe('share helpers', () => {
  it('builds the pre-armed text with name and price', () => {
    expect(buildShareText('Nuggets Premium x1kg', 'USD $25.50')).toBe(
      `Mira este producto en ${SHARE_BRAND}: Nuggets Premium x1kg — USD $25.50`,
    );
  });

  it('omits the price when not provided', () => {
    expect(buildShareText('  Nuggets  ')).toBe(`Mira este producto en ${SHARE_BRAND}: Nuggets`);
    expect(buildShareText('Nuggets', '   ')).toBe(`Mira este producto en ${SHARE_BRAND}: Nuggets`);
  });

  it('encodes the WhatsApp deep link', () => {
    const url = buildWhatsAppUrl('Hola mundo', 'https://tienda.test/products/1?x=1&y=2');

    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    expect(text).toBe('Hola mundo https://tienda.test/products/1?x=1&y=2');
    expect(url).not.toContain(' ');
    expect(url).toContain('%26');
  });

  it('builds the full payload used by ShareButton', () => {
    const payload = buildSharePayload({ title: 'Combo', price: 'Bs. 10,00', url: 'https://tienda.test/products/9' });

    expect(payload).toEqual({
      title: 'Combo',
      text: `Mira este producto en ${SHARE_BRAND}: Combo — Bs. 10,00`,
      url: 'https://tienda.test/products/9',
      whatsappUrl: buildWhatsAppUrl(`Mira este producto en ${SHARE_BRAND}: Combo — Bs. 10,00`, 'https://tienda.test/products/9'),
    });
  });
});
