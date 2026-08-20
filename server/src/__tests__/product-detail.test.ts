import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index'
import http from 'http'
import jwt from 'jsonwebtoken'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    brand: { findUnique: vi.fn(), findMany: vi.fn() },
    product: {
      findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
      count: vi.fn(), delete: vi.fn(), groupBy: vi.fn(),
    },
    productComment: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
      count: vi.fn(), aggregate: vi.fn(),
    },
    productReport: { findUnique: vi.fn(), create: vi.fn() },
    stockNotification: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    menuItemComment: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
      count: vi.fn(),
    },
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

const mockDb = (await vi.importMock('../lib/db')).db

type MockFn = ReturnType<typeof vi.fn>

const JWT_SECRET = 'dev-secret-change-in-prod'

function token(payload: { userId: string; role: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
}

function request(method: string, path: string, body?: any, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return
      const options: http.RequestOptions = {
        hostname: 'localhost', port: addr.port, path, method,
        headers: { 'Content-Type': 'application/json' } as any,
      }
      if (token) (options.headers as any)['Authorization'] = `Bearer ${token}`
      const req = http.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => { server.close(); resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : {} }) })
      })
      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  })
}

const clienteToken = token({ userId: 'user-1', role: 'cliente', email: 'client@test.com' })
const adminToken = token({ userId: 'user-admin', role: 'admin', email: 'admin@test.com' })

const mockProduct = {
  id: 'product-1', brandId: 'brand-1', name: 'Nuggets Premium x1kg', description: 'Nuggets congelados',
  priceCop: 107100, price: 25.50, currency: 'COP', category: 'congelados', images: ['img1', 'img2'],
  stock: 200, isActive: true, isFeatured: true, hasDiscount: true, discountPercent: 15,
  soldCount: 156, specifications: [{ key: 'Peso', value: '1kg' }], badges: ['trending'],
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockComment = {
  id: 'comment-1', productId: 'product-1', userId: 'user-1', type: 'question',
  content: 'Se puede usar en freidora?', images: [], rating: null,
  parentId: null, resolved: false, reactions: { helpful: 3 },
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockCommentWithUser = {
  ...mockComment,
  user: { id: 'user-1', name: 'Carlos M.', email: 'client@test.com' },
  replies: [],
}

const mockMenuItem = {
  id: 'menu-1', name: 'Hamburguesa Clasica', description: 'Deliciosa hamburguesa',
  basePrice: 8.50, currency: 'USD', category: 'comida rapida', image: 'img1',
  preparationTime: 15, isAvailable: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockMenuItemComment = {
  id: 'mic-1', menuItemId: 'menu-1', userId: 'user-1',
  content: 'Excelente sabor!', images: [], parentId: null,
  createdAt: new Date('2024-01-01'),
  user: { id: 'user-1', name: 'Carlos M.', email: 'client@test.com' },
  replies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockDb.exchangeRate.findMany as MockFn).mockResolvedValue([
    { id: 'r1', currency: 'Bs', rate: 36.50, updatedAt: new Date() },
    { id: 'r2', currency: 'USD', rate: 0.024, updatedAt: new Date() },
  ])
})

describe('Product Comments', () => {
  describe('GET /api/v1/products/:id/comments', () => {
    it('returns comments list with distribution', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findMany as MockFn).mockResolvedValue([mockCommentWithUser])
      ;(mockDb.productComment.count as MockFn).mockResolvedValue(1)
      ;(mockDb.productComment.aggregate as MockFn).mockResolvedValue({ _avg: { rating: 4.5 } })

      const res = await request('GET', '/api/v1/products/product-1/comments')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.data.comments).toBeDefined()
      expect(res.body.data.distribution).toBeDefined()
    })

    it('returns 404 for non-existent product', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(null)

      const res = await request('GET', '/api/v1/products/nonexistent/comments')

      expect(res.status).toBe(404)
    })

    it('supports filter by type', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findMany as MockFn).mockResolvedValue([])
      ;(mockDb.productComment.count as MockFn).mockResolvedValue(0)
      ;(mockDb.productComment.aggregate as MockFn).mockResolvedValue({ _avg: { rating: null } })

      const res = await request('GET', '/api/v1/products/product-1/comments?type=question')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('POST /api/v1/products/:id/comments', () => {
    it('creates a question without auth returns 401', async () => {
      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'question', content: 'Tienen stock?',
      })

      expect(res.status).toBe(401)
    })

    it('creates a question with auth returns 201', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.create as MockFn).mockImplementation((data: any) =>
        Promise.resolve({ ...mockComment, id: 'new-comment', content: data.data.content })
      )

      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'question', content: 'Tienen stock?',
      }, clienteToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
      expect(res.body.data.content).toBe('Tienen stock?')
    })

    it('creates a comment with rating returns 201', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.create as MockFn).mockResolvedValue({
        id: 'new-comment', productId: 'product-1', userId: 'user-1',
        type: 'comment', content: 'Excelente producto', images: [], rating: 5,
        parentId: null, resolved: null, reactions: {},
        createdAt: new Date(), updatedAt: new Date(),
      })

      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'comment', content: 'Excelente producto', rating: 5,
      }, clienteToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })

    it('rejects comment with invalid rating', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)

      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'comment', content: 'Mal rating', rating: 6,
      }, clienteToken)

      expect(res.status).toBe(400)
    })

    it('rejects empty content', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)

      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'question', content: '',
      }, clienteToken)

      expect(res.status).toBe(400)
    })

    it('rejects content over 500 chars', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)

      const res = await request('POST', '/api/v1/products/product-1/comments', {
        type: 'question', content: 'a'.repeat(501),
      }, clienteToken)

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/products/:id/comments/:commentId/reply', () => {
    it('creates a reply without auth returns 401', async () => {
      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/reply', {
        content: 'Si, se puede.',
      })

      expect(res.status).toBe(401)
    })

    it('creates a reply with auth returns 201', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findUnique as MockFn).mockResolvedValue(mockComment)
      ;(mockDb.productComment.create as MockFn).mockResolvedValue({
        id: 'reply-1', productId: 'product-1', userId: 'user-admin',
        type: 'reply', content: 'Si, se puede.', images: [], rating: null,
        parentId: 'comment-1', resolved: null, reactions: {},
        createdAt: new Date(), updatedAt: new Date(),
      })

      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/reply', {
        content: 'Si, se puede.',
      }, adminToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('POST /api/v1/products/:id/comments/:commentId/react', () => {
    it('reacts to a comment returns 200', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findUnique as MockFn).mockResolvedValue(mockComment)
      ;(mockDb.productComment.update as MockFn).mockResolvedValue({
        ...mockComment, reactions: { helpful: 4 },
      })

      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/react', {
        reaction: 'helpful',
      }, clienteToken)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('rejects invalid reaction type', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findUnique as MockFn).mockResolvedValue(mockComment)

      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/react', {
        reaction: 'invalid',
      }, clienteToken)

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/products/:id/comments/:commentId/resolve', () => {
    it('resolves a question as admin returns 200', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productComment.findUnique as MockFn).mockResolvedValue(mockComment)
      ;(mockDb.productComment.update as MockFn).mockResolvedValue({
        ...mockComment, resolved: true,
      })

      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/resolve', {}, adminToken)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('non-admin cannot resolve returns 403', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)

      const res = await request('POST', '/api/v1/products/product-1/comments/comment-1/resolve', {}, clienteToken)

      expect(res.status).toBe(403)
    })
  })
})

describe('Product Reports', () => {
  describe('POST /api/v1/products/:id/report', () => {
    it('reports a product returns 201', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productReport.findUnique as MockFn).mockResolvedValue(null)
      ;(mockDb.productReport.create as MockFn).mockResolvedValue({
        id: 'report-1', productId: 'product-1', userId: 'user-1',
        reason: 'misleading_info', details: 'Precio incorrecto',
        createdAt: new Date(),
      })
      ;(mockDb.user.findMany as MockFn).mockResolvedValue([])

      const res = await request('POST', '/api/v1/products/product-1/report', {
        reason: 'misleading_info', details: 'Precio incorrecto',
      }, clienteToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })

    it('duplicate report returns 409', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productReport.findUnique as MockFn).mockResolvedValue({ id: 'report-1' })

      const res = await request('POST', '/api/v1/products/product-1/report', {
        reason: 'misleading_info',
      }, clienteToken)

      expect(res.status).toBe(409)
    })

    it('without auth returns 401', async () => {
      const res = await request('POST', '/api/v1/products/product-1/report', {
        reason: 'misleading_info',
      })

      expect(res.status).toBe(401)
    })

    it('invalid reason returns 400', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.productReport.findUnique as MockFn).mockResolvedValue(null)

      const res = await request('POST', '/api/v1/products/product-1/report', {
        reason: 'invalid_reason',
      }, clienteToken)

      expect(res.status).toBe(400)
    })
  })
})

describe('Stock Notifications', () => {
  describe('POST /api/v1/products/:id/notify-stock', () => {
    it('subscribes to stock notification returns 201', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue({ ...mockProduct, stock: 0 })
      ;(mockDb.stockNotification.findUnique as MockFn).mockResolvedValue(null)
      ;(mockDb.stockNotification.create as MockFn).mockResolvedValue({
        id: 'sn-1', productId: 'product-1', userId: 'user-1', notified: false,
        createdAt: new Date(),
      })

      const res = await request('POST', '/api/v1/products/product-1/notify-stock', {}, clienteToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })

    it('duplicate subscription returns 409', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue({ ...mockProduct, stock: 0 })
      ;(mockDb.stockNotification.findUnique as MockFn).mockResolvedValue({ id: 'sn-1' })

      const res = await request('POST', '/api/v1/products/product-1/notify-stock', {}, clienteToken)

      expect(res.status).toBe(409)
    })

    it('product with stock returns 400', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue({ ...mockProduct, stock: 200 })

      const res = await request('POST', '/api/v1/products/product-1/notify-stock', {}, clienteToken)

      expect(res.status).toBe(400)
    })
  })
})

describe('Related Products', () => {
  describe('GET /api/v1/products/:id/related', () => {
    it('returns related products by category and boughtTogether', async () => {
      ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
      ;(mockDb.product.findMany as MockFn).mockResolvedValue([
        { id: 'related-1', name: 'Papas Fritas', priceCop: 35700, price: 8.50, images: ['img'], category: 'congelados' },
      ])
      ;(mockDb.orderItem.findMany as MockFn).mockResolvedValue([
        { productId: 'related-2', orderId: 'order-1' },
        { productId: 'related-2', orderId: 'order-2' },
      ])

      const res = await request('GET', '/api/v1/products/product-1/related')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.data.sameCategory).toBeDefined()
    })
  })
})

describe('Menu Item Comments', () => {
  describe('GET /api/v1/fastfood/menu/:id/comments', () => {
    it('returns comments for a menu item', async () => {
      ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItem)
      ;(mockDb.menuItemComment.findMany as MockFn).mockResolvedValue([mockMenuItemComment])
      ;(mockDb.menuItemComment.count as MockFn).mockResolvedValue(1)

      const res = await request('GET', '/api/v1/fastfood/menu/menu-1/comments')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.data.comments).toBeDefined()
    })

    it('returns 404 for non-existent menu item', async () => {
      ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(null)

      const res = await request('GET', '/api/v1/fastfood/menu/nonexistent/comments')

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/fastfood/menu/:id/comments', () => {
    it('creates a comment without auth returns 401', async () => {
      const res = await request('POST', '/api/v1/fastfood/menu/menu-1/comments', {
        content: 'Excelente!',
      })

      expect(res.status).toBe(401)
    })

    it('creates a comment with auth returns 201', async () => {
      ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItem)
      ;(mockDb.menuItemComment.create as MockFn).mockResolvedValue({
        ...mockMenuItemComment, id: 'new-mic',
      })

      const res = await request('POST', '/api/v1/fastfood/menu/menu-1/comments', {
        content: 'Excelente sabor!',
      }, clienteToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })

    it('rejects empty content', async () => {
      ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItem)

      const res = await request('POST', '/api/v1/fastfood/menu/menu-1/comments', {
        content: '',
      }, clienteToken)

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/fastfood/menu/:id/comments/:commentId/reply', () => {
    it('creates a reply with auth returns 201', async () => {
      ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItem)
      ;(mockDb.menuItemComment.findUnique as MockFn).mockResolvedValue(mockMenuItemComment)
      ;(mockDb.menuItemComment.create as MockFn).mockResolvedValue({
        id: 'reply-1', menuItemId: 'menu-1', userId: 'user-admin',
        content: 'Gracias!', parentId: 'mic-1', images: [],
        createdAt: new Date(),
      })

      const res = await request('POST', '/api/v1/fastfood/menu/menu-1/comments/mic-1/reply', {
        content: 'Gracias por tu comentario!',
      }, adminToken)

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
    })
  })
})
