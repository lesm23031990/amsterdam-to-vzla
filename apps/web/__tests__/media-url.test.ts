import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveMediaUrl } from '../src/lib/media';

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

describe('resolveMediaUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    if (ORIGINAL_API_URL === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
    }
  });

  it('devuelve null para valores vacíos', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
    expect(resolveMediaUrl('   ')).toBeNull();
  });

  it('deja intactas las URLs absolutas y los data URLs', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api/v1';

    expect(resolveMediaUrl('https://cdn.example.com/foto.png')).toBe('https://cdn.example.com/foto.png');
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(resolveMediaUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
  });

  it('antepone el origen de la API a las rutas /uploads', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://amsterdam-to-vzla-api.onrender.com/api/v1';

    expect(resolveMediaUrl('/uploads/comments/2026-11/abc.jpg')).toBe(
      'https://amsterdam-to-vzla-api.onrender.com/uploads/comments/2026-11/abc.jpg',
    );
    expect(resolveMediaUrl('uploads/comments/2026-11/abc.jpg')).toBe(
      'https://amsterdam-to-vzla-api.onrender.com/uploads/comments/2026-11/abc.jpg',
    );
  });

  it('mantiene la ruta relativa si la API es relativa o no está configurada', () => {
    expect(resolveMediaUrl('/uploads/comments/a.png')).toBe('/uploads/comments/a.png');

    process.env.NEXT_PUBLIC_API_URL = '/api/v1';
    expect(resolveMediaUrl('/uploads/comments/a.png')).toBe('/uploads/comments/a.png');
  });
});
