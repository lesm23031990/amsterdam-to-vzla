import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { app } from '../index'
import http from 'http'
import jwt from 'jsonwebtoken'
import { rm, readdir } from 'node:fs/promises'
import path from 'node:path'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    brand: { findUnique: vi.fn(), findMany: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    productComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    productReport: { findUnique: vi.fn(), create: vi.fn() },
    stockNotification: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    menuItemComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    menuItem: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn() },
    cart: { findUnique: vi.fn(), upsert: vi.fn() },
    cartItem: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    exchangeRate: { findMany: vi.fn() },
    notification: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
  hash: vi.fn(),
  compare: vi.fn(),
}))

const uploadsDir = vi.hoisted(() => {
  const dir = `${process.env.TEMP || process.env.TMP || '/tmp'}/atv-uploads-test`
  process.env.UPLOADS_DIR = dir
  return dir
})

const {
  parseImagePayload, validateCommentImages, getUploadsRoot, buildPublicUrl,
  MAX_IMAGE_BYTES, MAX_IMAGES_PER_COMMENT,
} = await import('../services/uploads')

const JWT_SECRET = 'dev-secret-change-in-prod'
const clienteToken = jwt.sign({ userId: 'user-1', role: 'cliente', email: 'client@test.com' }, JWT_SECRET, { expiresIn: '1h' })

// PNG 1x1 minimo valido
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)

function requestJson(method: string, urlPath: string, body?: unknown, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const req = http.request(
        { hostname: 'localhost', port: addr.port, path: urlPath, method, headers },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            server.close()
            resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : {} })
          })
        },
      )
      req.on('error', reject)
      if (body !== undefined) req.write(JSON.stringify(body))
      req.end()
    })
  })
}

function requestRaw(urlPath: string): Promise<{ status: number; contentType: string | undefined; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return
      const req = http.request({ hostname: 'localhost', port: addr.port, path: urlPath, method: 'GET' }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode || 0, contentType: res.headers['content-type'], body: Buffer.concat(chunks) })
        })
      })
      req.on('error', reject)
      req.end()
    })
  })
}

beforeAll(async () => {
  await rm(uploadsDir, { recursive: true, force: true })
})

afterAll(async () => {
  await rm(uploadsDir, { recursive: true, force: true })
})


describe('uploads service', () => {
  describe('parseImagePayload', () => {
    it('parses a data URL payload', () => {
      const result = parseImagePayload({ dataUrl: `data:image/png;base64,${PNG_BYTES.toString('base64')}` })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.image.contentType).toBe('image/png')
      expect(result.image.extension).toBe('png')
      expect(result.image.buffer.equals(PNG_BYTES)).toBe(true)
    })

    it('parses base64 + contentType payload', () => {
      const result = parseImagePayload({ data: PNG_BYTES.toString('base64'), contentType: 'image/jpeg' })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.image.extension).toBe('jpg')
    })

    it('rejects unsupported content types with 415', () => {
      const result = parseImagePayload({ data: PNG_BYTES.toString('base64'), contentType: 'image/gif' })

      expect(result).toEqual({ ok: false, status: 415, error: 'Formato no soportado. Usa JPG, PNG, WebP o AVIF' })
    })

    it('rejects images over 2MB with 413', () => {
      const big = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1).toString('base64')
      const result = parseImagePayload({ data: big, contentType: 'image/png' })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(413)
    })

    it('rejects missing data', () => {
      const result = parseImagePayload({ contentType: 'image/png' })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(400)
    })

    it('rejects malformed data URLs', () => {
      const result = parseImagePayload({ dataUrl: 'data:image/png;base64,%%%' })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(400)
    })
  })

  describe('validateCommentImages', () => {
    it('defaults to an empty array', () => {
      expect(validateCommentImages(undefined)).toEqual({ ok: true, images: [] })
    })

    it(`rejects more than ${MAX_IMAGES_PER_COMMENT} images`, () => {
      const result = validateCommentImages(['/uploads/a.png', '/uploads/b.png', '/uploads/c.png', '/uploads/d.png'])

      expect(result).toEqual({ ok: false, error: `Maximo ${MAX_IMAGES_PER_COMMENT} imagenes por comentario` })
    })

    it('rejects non-array values', () => {
      expect(validateCommentImages('http://x/y.png').ok).toBe(false)
    })

    it('rejects unsupported schemes (javascript:, data:)', () => {
      expect(validateCommentImages(['javascript:alert(1)']).ok).toBe(false)
      expect(validateCommentImages(['data:image/png;base64,AAAA']).ok).toBe(false)
    })

    it('accepts http(s) URLs and /uploads/ paths, deduping', () => {
      const result = validateCommentImages(['https://cdn.test/a.png', '/uploads/comments/2026-11/a.png', 'https://cdn.test/a.png'])

      expect(result).toEqual({ ok: true, images: ['https://cdn.test/a.png', '/uploads/comments/2026-11/a.png'] })
    })
  })

  describe('paths', () => {
    it('uses UPLOADS_DIR when set', () => {
      expect(getUploadsRoot()).toBe(path.resolve(uploadsDir))
    })

    it('builds absolute public URLs', () => {
      expect(buildPublicUrl('/uploads/a.png', 'http://localhost:3001/')).toBe('http://localhost:3001/uploads/a.png')
      expect(buildPublicUrl('https://cdn.test/a.png', 'http://localhost:3001')).toBe('https://cdn.test/a.png')
    })
  })
})


describe('POST /api/v1/uploads', () => {
  it('requires auth', async () => {
    const res = await requestJson('POST', '/api/v1/uploads', {
      dataUrl: `data:image/png;base64,${PNG_BYTES.toString('base64')}`,
    })

    expect(res.status).toBe(401)
  })

  it('saves the image and returns a public URL', async () => {
    const res = await requestJson(
      'POST',
      '/api/v1/uploads',
      { dataUrl: `data:image/png;base64,${PNG_BYTES.toString('base64')}` },
      clienteToken,
    )

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.path).toMatch(/^\/uploads\/comments\/\d{4}-\d{2}\/[a-f0-9-]+\.png$/)
    expect(res.body.data.url).toMatch(/^http:\/\/localhost:\d+\/uploads\/comments\/\d{4}-\d{2}\/[a-f0-9-]+\.png$/)
    expect(res.body.data.url.endsWith(res.body.data.path)).toBe(true)
    expect(res.body.data.size).toBe(PNG_BYTES.length)
    expect(res.body.data.contentType).toBe('image/png')

    const buckets = await readdir(path.join(uploadsDir, 'comments'))
    expect(buckets.length).toBe(1)
  })

  it('serves the uploaded file from /uploads', async () => {
    const upload = await requestJson(
      'POST',
      '/api/v1/uploads',
      { data: PNG_BYTES.toString('base64'), contentType: 'image/png' },
      clienteToken,
    )
    expect(upload.status).toBe(201)

    const file = await requestRaw(upload.body.data.path)

    expect(file.status).toBe(200)
    expect(file.contentType).toContain('image/png')
    expect(file.body.equals(PNG_BYTES)).toBe(true)
  })

  it('rejects unsupported formats with 415', async () => {
    const res = await requestJson('POST', '/api/v1/uploads', { data: 'AAAA', contentType: 'image/gif' }, clienteToken)

    expect(res.status).toBe(415)
    expect(res.body.ok).toBe(false)
  })

  it('rejects images over the size limit with 413', async () => {
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1).toString('base64')
    const res = await requestJson('POST', '/api/v1/uploads', { data: big, contentType: 'image/png' }, clienteToken)

    expect(res.status).toBe(413)
  })

  it('returns 404 for unknown upload paths', async () => {
    const res = await requestRaw('/uploads/comments/1999-01/missing.png')

    expect(res.status).toBe(404)
  })
})
