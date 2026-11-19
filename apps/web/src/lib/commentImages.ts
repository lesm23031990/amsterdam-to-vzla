export const MAX_COMMENT_IMAGES = 3;
export const MAX_COMMENT_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_COMMENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ALLOWED_COMMENT_IMAGE_ACCEPT = ALLOWED_COMMENT_IMAGE_TYPES.join(',');

export interface FileLike {
  type: string;
  size: number;
}

/** Devuelve un mensaje de error o null si el archivo es valido. */
export function validateImageFile(file: FileLike): string | null {
  if (!ALLOWED_COMMENT_IMAGE_TYPES.includes(file.type)) {
    return 'Formato no soportado. Usa JPG, PNG, WebP o AVIF';
  }
  if (file.size > MAX_COMMENT_IMAGE_BYTES) {
    return 'Cada foto debe pesar maximo 2MB';
  }
  return null;
}

export function remainingImageSlots(current: number, max = MAX_COMMENT_IMAGES): number {
  return Math.max(0, max - current);
}

export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
