import { describe, it, expect } from 'vitest';
import {
  ALLOWED_COMMENT_IMAGE_TYPES,
  MAX_COMMENT_IMAGE_BYTES,
  MAX_COMMENT_IMAGES,
  formatMegabytes,
  remainingImageSlots,
  validateImageFile,
} from '../src/lib/commentImages';

describe('comment image helpers', () => {
  it('accepts allowed formats under the size limit', () => {
    ALLOWED_COMMENT_IMAGE_TYPES.forEach((type) => {
      expect(validateImageFile({ type, size: 1024 })).toBeNull();
    });
  });

  it('rejects unsupported formats', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1024 })).toContain('Formato no soportado');
    expect(validateImageFile({ type: 'application/pdf', size: 1024 })).toContain('Formato no soportado');
  });

  it('rejects files over 2MB', () => {
    expect(validateImageFile({ type: 'image/png', size: MAX_COMMENT_IMAGE_BYTES })).toBeNull();
    expect(validateImageFile({ type: 'image/png', size: MAX_COMMENT_IMAGE_BYTES + 1 })).toContain('2MB');
  });

  it('computes remaining slots and never goes negative', () => {
    expect(remainingImageSlots(0)).toBe(MAX_COMMENT_IMAGES);
    expect(remainingImageSlots(2)).toBe(1);
    expect(remainingImageSlots(3)).toBe(0);
    expect(remainingImageSlots(5)).toBe(0);
  });

  it('formats the size limit for the UI hint', () => {
    expect(formatMegabytes(MAX_COMMENT_IMAGE_BYTES)).toBe('2MB');
  });
});
