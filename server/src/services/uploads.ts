import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Limites para imagenes de comentarios (spec-22)
export const MAX_IMAGES_PER_COMMENT = 3
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGE_URL_LENGTH = 2048

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS)

const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i
const ALLOWED_IMAGE_URL_RE = /^(https?:\/\/|\/uploads\/)/i

export interface ParsedImage {
  buffer: Buffer
  contentType: string
  extension: string
}

export type ImageParseResult =
  | { ok: true; image: ParsedImage }
  | { ok: false; status: number; error: string }

export interface SavedImage {
  /** Ruta publica relativa, ej. /uploads/comments/2026-11/uuid.png */
  url: string
  absolutePath: string
  size: number
  contentType: string
}

function normalizeContentType(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.split(';')[0].trim().toLowerCase()
}

function invalidBase64Error(): ImageParseResult {
  return { ok: false, status: 400, error: 'Base64 invalido' }
}

/**
 * Interpreta el body de POST /api/v1/uploads.
 * Acepta `{ dataUrl }` o `{ data, contentType }` (data puede ser base64 puro o data URL).
 */
export function parseImagePayload(body: unknown): ImageParseResult {
  const payload = (body ?? {}) as { data?: unknown; dataUrl?: unknown; contentType?: unknown }
  let contentType = normalizeContentType(payload.contentType)
  let base64 = ''

  if (typeof payload.dataUrl === 'string') {
    const match = DATA_URL_RE.exec(payload.dataUrl.trim())
    if (!match) return invalidBase64Error()
    contentType = contentType || match[1].toLowerCase()
    base64 = match[2]
  } else if (typeof payload.data === 'string' && payload.data.trim().length > 0) {
    const raw = payload.data.trim()
    if (raw.startsWith('data:')) {
      const match = DATA_URL_RE.exec(raw)
      if (!match) return invalidBase64Error()
      contentType = contentType || match[1].toLowerCase()
      base64 = match[2]
    } else {
      base64 = raw
    }
  } else {
    return { ok: false, status: 400, error: 'Falta el campo data o dataUrl con la imagen en base64' }
  }

  if (!contentType) {
    return { ok: false, status: 400, error: 'Falta el campo contentType' }
  }

  const extension = IMAGE_EXTENSIONS[contentType]
  if (!extension) {
    return { ok: false, status: 415, error: 'Formato no soportado. Usa JPG, PNG, WebP o AVIF' }
  }

  if (base64.length === 0 || base64.length % 4 !== 0) {
    return invalidBase64Error()
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) {
    return { ok: false, status: 400, error: 'La imagen esta vacia' }
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: `La imagen supera ${MAX_IMAGE_BYTES / (1024 * 1024)}MB` }
  }

  return { ok: true, image: { buffer, contentType, extension } }
}

export function getUploadsRoot(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), 'uploads')
}

/** Guarda la imagen en <uploads>/comments/YYYY-MM/<uuid>.<ext> */
export async function saveImage(image: ParsedImage, now: Date = new Date()): Promise<SavedImage> {
  const bucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const filename = `${randomUUID()}.${image.extension}`
  const dir = path.join(getUploadsRoot(), 'comments', bucket)
  const absolutePath = path.join(dir, filename)

  await mkdir(dir, { recursive: true })
  await writeFile(absolutePath, image.buffer)

  return {
    url: `/uploads/comments/${bucket}/${filename}`,
    absolutePath,
    size: image.buffer.length,
    contentType: image.contentType,
  }
}

export function buildPublicUrl(relativePath: string, origin: string): string {
  if (/^https?:\/\//i.test(relativePath)) return relativePath
  const base = origin.replace(/\/$/, '')
  return `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
}

export type ImagesValidation =
  | { ok: true; images: string[] }
  | { ok: false; error: string }

/** Valida el campo `images` de un comentario: max 3, URLs http(s) o rutas /uploads/. */
export function validateCommentImages(value: unknown): ImagesValidation {
  if (value === undefined || value === null) return { ok: true, images: [] }
  if (!Array.isArray(value)) return { ok: false, error: 'images debe ser un arreglo de URLs' }
  if (value.length > MAX_IMAGES_PER_COMMENT) {
    return { ok: false, error: `Maximo ${MAX_IMAGES_PER_COMMENT} imagenes por comentario` }
  }

  const images: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return { ok: false, error: 'Cada imagen debe ser una URL' }
    const url = item.trim()
    if (!url) return { ok: false, error: 'URL de imagen vacia' }
    if (url.length > MAX_IMAGE_URL_LENGTH) return { ok: false, error: 'URL de imagen demasiado larga' }
    if (!ALLOWED_IMAGE_URL_RE.test(url)) {
      return { ok: false, error: 'Solo se permiten imagenes subidas o URLs http(s)' }
    }
    if (!images.includes(url)) images.push(url)
  }

  return { ok: true, images }
}
