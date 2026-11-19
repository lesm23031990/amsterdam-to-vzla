import { describe, it, expect } from 'vitest';
import {
  buildShareMessage,
  buildWhatsAppUrl,
  productUrl,
  webBaseUrl,
  SHARE_BRAND,
  DEFAULT_WEB_URL,
} from '../src/lib/share';

describe('share (mobile)', () => {
  it('construye la URL pública del producto', () => {
    expect(productUrl('abc-123')).toBe(`${DEFAULT_WEB_URL}/products/abc-123`);
    expect(productUrl('abc', 'https://demo.example.com/')).toBe('https://demo.example.com/products/abc');
    expect(productUrl('a b', 'https://demo.example.com')).toBe('https://demo.example.com/products/a%20b');
  });

  it('normaliza la URL base', () => {
    expect(webBaseUrl('https://demo.example.com///')).toBe('https://demo.example.com');
    expect(webBaseUrl('')).toBe(DEFAULT_WEB_URL);
    expect(webBaseUrl(null)).toBe(DEFAULT_WEB_URL);
  });

  it('incluye marca, producto y enlace en el mensaje', () => {
    const message = buildShareMessage('Nuggets x1kg', 'USD $12.50', 'https://demo.example.com/products/abc');
    expect(message).toContain(SHARE_BRAND);
    expect(message).toContain('Nuggets x1kg — USD $12.50');
    expect(message).toContain('https://demo.example.com/products/abc');
  });

  it('genera el deep link de WhatsApp con el texto codificado', () => {
    expect(buildWhatsAppUrl('Hola mundo')).toBe('https://wa.me/?text=Hola%20mundo');
  });
});
