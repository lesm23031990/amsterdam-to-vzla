import { describe, it, expect } from 'vitest';
import { resolveMediaUrl } from '../src/lib/media';

describe('resolveMediaUrl (mobile)', () => {
  it('devuelve null para valores vacíos', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
    expect(resolveMediaUrl('   ')).toBeNull();
  });

  it('deja intactas las URLs absolutas y los data URLs', () => {
    expect(resolveMediaUrl('https://cdn.example.com/foto.png', 'http://192.168.0.100:3001')).toBe(
      'https://cdn.example.com/foto.png',
    );
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('antepone el origen de la API a las rutas /uploads', () => {
    expect(resolveMediaUrl('/uploads/comments/2026-11/abc.jpg', 'http://192.168.0.100:3001')).toBe(
      'http://192.168.0.100:3001/uploads/comments/2026-11/abc.jpg',
    );
    expect(resolveMediaUrl('uploads/a.png', 'http://192.168.0.100:3001/')).toBe(
      'http://192.168.0.100:3001/uploads/a.png',
    );
  });

  it('quita el sufijo /api/v1 y usa localhost por defecto', () => {
    expect(resolveMediaUrl('/uploads/a.png', 'https://api.example.com/api/v1')).toBe(
      'https://api.example.com/uploads/a.png',
    );
    expect(resolveMediaUrl('/uploads/a.png', '')).toBe('http://localhost:3001/uploads/a.png');
  });
});
