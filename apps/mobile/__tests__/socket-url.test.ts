import { afterEach, describe, expect, it } from 'vitest';
import { getSocketUrl } from '../src/lib/socket';

const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (previousApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
  }
});

describe('getSocketUrl', () => {
  it('deriva el origen desde la URL de la API', () => {
    expect(getSocketUrl('http://192.168.1.10:3001')).toBe('http://192.168.1.10:3001');
    expect(getSocketUrl('https://api.amsterdam.example.com')).toBe('https://api.amsterdam.example.com');
  });

  it('descarta path, query y slash final', () => {
    expect(getSocketUrl('https://api.example.com/api/v1/')).toBe('https://api.example.com');
    expect(getSocketUrl('http://localhost:3001?foo=bar')).toBe('http://localhost:3001');
  });

  it('devuelve null cuando no hay URL válida', () => {
    expect(getSocketUrl('')).toBeNull();
    expect(getSocketUrl('   ')).toBeNull();
    expect(getSocketUrl('localhost:3001')).toBeNull();
    expect(getSocketUrl('ftp://example.com')).toBeNull();
  });

  it('usa EXPO_PUBLIC_API_URL como fallback', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.0.5:3001';
    expect(getSocketUrl()).toBe('http://10.0.0.5:3001');
  });

  it('devuelve null si EXPO_PUBLIC_API_URL no está configurada', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getSocketUrl()).toBeNull();
  });
});
