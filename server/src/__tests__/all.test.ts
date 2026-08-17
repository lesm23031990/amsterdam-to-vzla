import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index'
import http from 'http'
import jwt from 'jsonwebtoken'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    store: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscriptionPlan: { findMany: vi.fn(), findUnique: vi.fn() },
    storeSubscription: { create: vi.fn(), findFirst: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    cart: { findUnique: vi.fn(), upsert: vi.fn() },
    cartItem: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    delivery: { findUnique: vi.fn(), create: vi.fn() },
    deliveryLocation: { create: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    menuOption: { create: vi.fn() },
    conversation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
  hash: vi.fn(),
  compare: vi.fn(),
}))

import bcrypt from 'bcryptjs'

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

const mockUser = {
  id: 'user-1', email: 'test@test.com', name: 'Test User', phone: '+584241234567',
  role: 'admin', password: 'hashed_password', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockStore = {
  id: 'store-1', name: 'Tienda Test', slug: 'tienda-test', description: 'Descripción', phone: '+584241234567',
  address: 'San Cristóbal', category: 'general', coverImage: null, logoImage: null,
  status: 'active', ownerId: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockProduct = {
  id: 'product-1', storeId: 'store-1', name: 'Producto Test', description: 'Descripción',
  price: 25.50, currency: 'USD', category: 'ropa', images: [], stock: 100, isActive: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockPlan = {
  id: 'plan-1', name: 'Plan Básico', price: 29.99, currency: 'USD', interval: 'monthly',
  features: ['feature1'], createdAt: new Date('2024-01-01'),
}

const mockSubscription = {
  id: 'sub-1', storeId: 'store-1', planId: 'plan-1', status: 'active',
  startsAt: new Date('2024-01-01'), expiresAt: new Date('2025-01-01'), createdAt: new Date('2024-01-01'),
}

const mockCart = {
  id: 'cart-1', userId: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockCartItem = {
  id: 'ci-1', cartId: 'cart-1', productId: 'product-1', quantity: 2, price: 25.50, createdAt: new Date('2024-01-01'),
}

const mockOrder = {
  id: 'order-1', userId: 'user-1', storeId: 'store-1', status: 'pending_payment', total: 51.00,
  currency: 'USD', paymentMethod: 'cash', paymentStatus: 'pending', paymentRef: null, paymentUrl: null,
  deliveryAddress: 'Dirección', notes: null, contactPhone: '+584241234567',
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockDelivery = {
  id: 'delivery-1', orderId: 'order-1', driverId: 'driver-1', status: 'assigned',
  createdAt: new Date('2024-01-01'),
}

const mockLocation = {
  id: 'loc-1', deliveryId: 'delivery-1', lat: 7.7703, lng: -72.2292, createdAt: new Date('2024-01-01'),
}

const mockMenuItem = {
  id: 'menu-1', storeId: 'store-1', name: 'Hamburguesa', description: 'Deliciosa', basePrice: 8.50,
  currency: 'USD', category: 'comida rápida', image: null, preparationTime: 15, isAvailable: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockOption = {
  id: 'opt-1', menuItemId: 'menu-1', name: 'Tamaño', type: 'single', required: true,
  createdAt: new Date('2024-01-01'), choices: [],
}

const mockConversation = {
  id: 'conv-1', userId: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  _count: { messages: 2 },
  messages: [
    { id: 'msg-2', role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?', createdAt: new Date('2024-01-01') },
  ],
}

const mockMessage = {
  id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hola', createdAt: new Date('2024-01-01'),
}

const clienteToken = token({ userId: 'user-1', role: 'cliente', email: 'client@test.com' })
const adminToken = token({ userId: 'user-admin', role: 'admin', email: 'admin@test.com' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Auth', () => {
  it('Register with valid data returns 201', async () => {
    (mockDb.user.findUnique as MockFn).mockResolvedValue(null)
    ;(bcrypt.hash as MockFn).mockResolvedValue('hashed_password')
    ;(mockDb.user.create as MockFn).mockResolvedValue(mockUser)

    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@test.com', password: 'SecurePass123!', name: 'Test User', phone: '+584241234567', role: 'cliente',
    })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe('test@test.com')
  })

  it('Register with duplicate email returns 409', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue(mockUser)

    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@test.com', password: 'SecurePass123!', name: 'Test User', role: 'cliente',
    })

    expect(res.status).toBe(409)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('email')
  })

  it('Register with missing password returns 400', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@test.com', password: '', name: 'Test User',
    })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('Login with valid credentials returns 200 + token', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue(mockUser)
    ;(bcrypt.compare as MockFn).mockResolvedValue(true)

    const res = await request('POST', '/api/v1/auth/login', {
      email: 'test@test.com', password: 'SecurePass123!',
    })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.token).toBeDefined()
  })

  it('Login with wrong password returns 401', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue(mockUser)
    ;(bcrypt.compare as MockFn).mockResolvedValue(false)

    const res = await request('POST', '/api/v1/auth/login', {
      email: 'test@test.com', password: 'wrong',
    })

    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })

  it('Login with non-existent email returns 401', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('POST', '/api/v1/auth/login', {
      email: 'nobody@test.com', password: 'SecurePass123!',
    })

    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })

  it('GET /me with valid token returns user', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue({
      id: 'user-1', email: 'test@test.com', name: 'Test User', phone: '+584241234567', role: 'admin', createdAt: new Date('2024-01-01'),
    })

    const res = await request('GET', '/api/v1/auth/me', undefined, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.email).toBe('test@test.com')
  })

  it('GET /me without token returns 401', async () => {
    const res = await request('GET', '/api/v1/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })
})

describe('Stores', () => {
  it('Create store with valid data returns 201', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(null)
    ;(mockDb.store.create as MockFn).mockResolvedValue(mockStore)

    const res = await request('POST', '/api/v1/stores', {
      name: 'Tienda Test', slug: 'tienda-test', description: 'Descripción', phone: '+584241234567', address: 'San Cristóbal',
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.slug).toBe('tienda-test')
  })

  it('Create store with duplicate slug returns 409', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)

    const res = await request('POST', '/api/v1/stores', {
      name: 'Tienda Test', slug: 'tienda-test',
    }, adminToken)

    expect(res.status).toBe(409)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('slug')
  })

  it('Create store without admin role returns 403', async () => {
    const res = await request('POST', '/api/v1/stores', {
      name: 'Tienda Test', slug: 'tienda-test',
    }, clienteToken)

    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('List stores returns 200', async () => {
    ;(mockDb.store.findMany as MockFn).mockResolvedValue([mockStore])

    const res = await request('GET', '/api/v1/stores')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Get store by slug returns 200', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({
      ...mockStore, owner: { id: 'user-1', name: 'Test User' },
    })

    const res = await request('GET', '/api/v1/stores/tienda-test')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.slug).toBe('tienda-test')
  })

  it('Get store by slug returns 404 when not found', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('GET', '/api/v1/stores/not-found')

    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('Update own store returns 200', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.store.update as MockFn).mockResolvedValue({ ...mockStore, name: 'Updated Store' })

    const res = await request('PATCH', '/api/v1/stores/store-1', { name: 'Updated Store' }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Updated Store')
  })

  it('Update someone else\'s store returns 403', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({ ...mockStore, ownerId: 'other-user' })

    const res = await request('PATCH', '/api/v1/stores/store-1', { name: 'Hacked' }, clienteToken)

    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('List plans returns 200', async () => {
    ;(mockDb.subscriptionPlan.findMany as MockFn).mockResolvedValue([mockPlan])

    const res = await request('GET', '/api/v1/stores/plans/list')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Subscribe store to plan returns 201', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.subscriptionPlan.findUnique as MockFn).mockResolvedValue(mockPlan)
    ;(mockDb.storeSubscription.create as MockFn).mockResolvedValue(mockSubscription)

    const res = await request('POST', '/api/v1/stores/store-1/subscribe', { planId: 'plan-1' }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('active')
  })

  it('Subscribe store without auth returns 401', async () => {
    const res = await request('POST', '/api/v1/stores/store-1/subscribe', { planId: 'plan-1' })

    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })
})

describe('Products', () => {
  it('Create product with valid data returns 201', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.product.create as MockFn).mockResolvedValue(mockProduct)

    const res = await request('POST', '/api/v1/products', {
      storeId: 'store-1', name: 'Producto Test', price: 25.50, category: 'congelados', stock: 100,
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Producto Test')
  })

  it('Create product without admin role returns 403', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)

    const res = await request('POST', '/api/v1/products', {
      storeId: 'store-1', name: 'Producto Test', price: 25.50,
    }, clienteToken)

    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('Create product without being owner returns 403', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({ ...mockStore, ownerId: 'other-user' })

    const res = await request('POST', '/api/v1/products', {
      storeId: 'store-1', name: 'Producto Test', price: 25.50,
    }, clienteToken)

    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('List products with pagination returns 200', async () => {
    ;(mockDb.product.findMany as MockFn).mockResolvedValue([mockProduct])
    ;(mockDb.product.count as MockFn).mockResolvedValue(1)

    const res = await request('GET', '/api/v1/products?page=1&perPage=20')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.pagination).toBeDefined()
    expect(res.body.pagination.total).toBe(1)
  })

  it('List products filtered by storeId returns 200', async () => {
    ;(mockDb.product.findMany as MockFn).mockResolvedValue([mockProduct])
    ;(mockDb.product.count as MockFn).mockResolvedValue(1)

    const res = await request('GET', '/api/v1/products?storeId=store-1')

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('Get product by id returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue({
      ...mockProduct, store: { id: 'store-1', name: 'Tienda Test', slug: 'tienda-test' },
    })

    const res = await request('GET', '/api/v1/products/product-1')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.id).toBe('product-1')
  })

  it('Get product by id returns 404 for inactive product', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('GET', '/api/v1/products/non-existent')

    expect(res.status).toBe(404)
  })

  it('Update own product returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.product.update as MockFn).mockResolvedValue({ ...mockProduct, name: 'Updated', price: 30 })

    const res = await request('PATCH', '/api/v1/products/product-1', { name: 'Updated', price: 30 }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Update someone else\'s product returns 403', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue({ ...mockProduct, storeId: 'other-store' })
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({ ...mockStore, id: 'other-store', ownerId: 'other-user' })

    const res = await request('PATCH', '/api/v1/products/product-1', { name: 'Hacked' }, clienteToken)

    expect(res.status).toBe(403)
  })

  it('Delete product (soft delete) returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.product.update as MockFn).mockResolvedValue({ ...mockProduct, isActive: false })

    const res = await request('DELETE', '/api/v1/products/product-1', undefined, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockDb.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })
})

describe('Cart', () => {
  it('Add item to cart returns 201', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
    ;(mockDb.cart.upsert as MockFn).mockResolvedValue(mockCart)
    ;(mockDb.cartItem.findFirst as MockFn).mockResolvedValue(null)
    ;(mockDb.cartItem.create as MockFn).mockResolvedValue(mockCartItem)

    const res = await request('POST', '/api/v1/cart/items', { productId: 'product-1', quantity: 2 }, clienteToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.quantity).toBe(2)
  })

  it('Add item with insufficient stock returns 400', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue({ ...mockProduct, stock: 1 })

    const res = await request('POST', '/api/v1/cart/items', { productId: 'product-1', quantity: 5 }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('Stock')
  })

  it('Get cart returns 200', async () => {
    const cartWithItems = {
      ...mockCart,
      items: [{
        ...mockCartItem,
        product: {
          ...mockProduct,
          store: { id: 'store-1', name: 'Tienda Test', slug: 'tienda-test' },
        },
      }],
    }
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(cartWithItems)

    const res = await request('GET', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.total).toBeGreaterThan(0)
    expect(Array.isArray(res.body.data.stores)).toBe(true)
  })

  it('Get empty cart returns 200 with null id', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('GET', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBeNull()
  })

  it('Update item quantity returns 200', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockCartItem, cart: mockCart, product: mockProduct,
    })
    ;(mockDb.cartItem.update as MockFn).mockResolvedValue({ ...mockCartItem, quantity: 5 })

    const res = await request('PATCH', '/api/v1/cart/items/ci-1', { quantity: 5 }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Update item exceeding stock returns 400', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockCartItem, cart: mockCart, product: { ...mockProduct, stock: 3 },
    })

    const res = await request('PATCH', '/api/v1/cart/items/ci-1', { quantity: 10 }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Stock')
  })

  it('Remove item returns 200', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockCartItem, cart: mockCart,
    })
    ;(mockDb.cartItem.delete as MockFn).mockResolvedValue(mockCartItem)

    const res = await request('DELETE', '/api/v1/cart/items/ci-1', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Remove item from other user returns 403', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockCartItem, cart: { ...mockCart, userId: 'other-user' },
    })

    const res = await request('DELETE', '/api/v1/cart/items/ci-1', undefined, clienteToken)

    expect(res.status).toBe(403)
  })

  it('Clear cart returns 200', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(mockCart)
    ;(mockDb.cartItem.deleteMany as MockFn).mockResolvedValue({ count: 2 })

    const res = await request('DELETE', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Clear empty cart returns 200', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('DELETE', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('Checkout', () => {
  it('Create order from cart returns 201', async () => {
    const cartWithItems = {
      ...mockCart,
      items: [{
        ...mockCartItem,
        product: {
          id: 'product-1', name: 'Producto Test', price: 25.50, storeId: 'store-1',
          store: { id: 'store-1', name: 'Tienda Test' },
        },
      }],
    }
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(cartWithItems)
    ;(mockDb.order.create as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.cartItem.deleteMany as MockFn).mockResolvedValue({ count: 1 })

    const res = await request('POST', '/api/v1/checkout', {
      paymentMethod: 'cash', deliveryAddress: 'San Cristóbal', contactPhone: '+584241234567',
    }, clienteToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Create order from empty cart returns 400', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue({ ...mockCart, items: [] })

    const res = await request('POST', '/api/v1/checkout', {
      paymentMethod: 'cash', deliveryAddress: 'San Cristóbal',
    }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('vacío')
  })

  it('Create order with invalid payment method returns 400', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue({
      ...mockCart,
      items: [{ ...mockCartItem, product: { id: 'product-1', name: 'Test', price: 10, storeId: 'store-1', store: { id: 'store-1', name: 'Tienda' } } }],
    })

    const res = await request('POST', '/api/v1/checkout', {
      paymentMethod: 'bitcoin', deliveryAddress: 'San Cristóbal',
    }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('Pay order returns 200', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, paymentMethod: 'transfer', paymentStatus: 'pending',
    })
    ;(mockDb.order.update as MockFn).mockResolvedValue({
      ...mockOrder, paymentStatus: 'paid', paymentRef: 'REF123',
    })

    const res = await request('POST', '/api/v1/checkout/orders/order-1/pay', { paymentRef: 'REF123' }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Pay already paid order returns 400', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, paymentMethod: 'cash', paymentStatus: 'paid',
    })

    const res = await request('POST', '/api/v1/checkout/orders/order-1/pay', { paymentRef: 'REF123' }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('Pay order of another user returns 403', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, userId: 'other-user', paymentMethod: 'cash', paymentStatus: 'pending',
    })

    const res = await request('POST', '/api/v1/checkout/orders/order-1/pay', { paymentRef: 'REF123' }, clienteToken)

    expect(res.status).toBe(403)
  })
})

describe('Delivery', () => {
  it('Update order status returns 200', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.order.update as MockFn).mockResolvedValue({ ...mockOrder, status: 'confirmed' })

    const res = await request('PATCH', '/api/v1/delivery/orders/order-1/status', { status: 'confirmed' }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('confirmed')
  })

  it('Update order status with invalid transition returns 400', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({ ...mockOrder, status: 'delivered' })

    const res = await request('PATCH', '/api/v1/delivery/orders/order-1/status', { status: 'confirmed' }, adminToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('Update order status without auth returns 401', async () => {
    const res = await request('PATCH', '/api/v1/delivery/orders/order-1/status', { status: 'confirmed' })

    expect(res.status).toBe(401)
  })

  it('Assign driver returns 201', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({ ...mockOrder, status: 'confirmed' })
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue({
      id: 'driver-1', role: 'repartidor', name: 'Driver', email: 'driver@test.com',
    })
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue(null)
    ;(mockDb.delivery.create as MockFn).mockResolvedValue(mockDelivery)
    ;(mockDb.order.update as MockFn).mockResolvedValue({ ...mockOrder, status: 'preparing' })

    const res = await request('POST', '/api/v1/delivery/orders/order-1/assign', { driverId: 'driver-1' }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('assigned')
  })

  it('Assign driver with any user returns 201', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue({ id: 'user-1', role: 'cliente', name: 'User', email: 'user@test.com' })
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue(null)
    ;(mockDb.delivery.create as MockFn).mockResolvedValue(mockDelivery)
    ;(mockDb.order.update as MockFn).mockResolvedValue({ ...mockOrder, status: 'preparing' })

    const res = await request('POST', '/api/v1/delivery/orders/order-1/assign', { driverId: 'user-1' }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('assigned')
  })

  it('Assign driver when already assigned returns 409', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue({ id: 'driver-1', role: 'repartidor' })
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue(mockDelivery)

    const res = await request('POST', '/api/v1/delivery/orders/order-1/assign', { driverId: 'driver-1' }, adminToken)

    expect(res.status).toBe(409)
    expect(res.body.ok).toBe(false)
  })

  it('Track delivery returns 200', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, status: 'in_transit',
      store: { ownerId: 'user-1' },
      delivery: {
        ...mockDelivery,
        driver: { id: 'driver-1', name: 'Driver', phone: '+584241234567' },
        locations: [mockLocation],
      },
    })

    const res = await request('GET', '/api/v1/delivery/orders/order-1/tracking', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).not.toBeNull()
    expect(res.body.data.latestLocation).toBeDefined()
  })

  it('Track delivery without delivery returns null', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, store: { ownerId: 'user-1' }, delivery: null,
    })

    const res = await request('GET', '/api/v1/delivery/orders/order-1/tracking', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.data).toBeNull()
  })

  it('Track delivery of unauthorized user returns 403', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, userId: 'stranger', store: { ownerId: 'stranger' }, delivery: null,
    })

    const strangerToken = token({ userId: 'stranger2', role: 'cliente', email: 'x@x.com' })
    const res = await request('GET', '/api/v1/delivery/orders/order-1/tracking', undefined, strangerToken)

    expect(res.status).toBe(403)
  })

  it('Update location returns 200', async () => {
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue({
      ...mockDelivery, driver: { id: 'driver-1' },
    })
    ;(mockDb.deliveryLocation.create as MockFn).mockResolvedValue(mockLocation)

    const res = await request('PATCH', '/api/v1/delivery/delivery/delivery-1/location', { lat: 7.7703, lng: -72.2292 }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Update location without coordinates returns 400', async () => {
    const res = await request('PATCH', '/api/v1/delivery/delivery/delivery-1/location', {}, adminToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })
})

describe('FastFood', () => {
  it('Create menu item returns 201', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue(mockStore)
    ;(mockDb.menuItem.create as MockFn).mockResolvedValue(mockMenuItem)

    const res = await request('POST', '/api/v1/fastfood/stores/store-1/menu', {
      name: 'Hamburguesa', basePrice: 8.50, description: 'Deliciosa', preparationTime: 15, category: 'comida rápida',
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Hamburguesa')
  })

  it('Create menu item for another store returns 403', async () => {
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({ ...mockStore, ownerId: 'other-user' })

    const res = await request('POST', '/api/v1/fastfood/stores/store-1/menu', {
      name: 'Hamburguesa', basePrice: 8.50,
    }, clienteToken)

    expect(res.status).toBe(403)
  })

  it('List menu items returns 200', async () => {
    ;(mockDb.menuItem.findMany as MockFn).mockResolvedValue([{
      ...mockMenuItem,
      options: [{
        ...mockOption, choices: [{ id: 'choice-1', menuOptionId: 'opt-1', name: 'Grande', priceModifier: 1.50 }],
      }],
    }])

    const res = await request('GET', '/api/v1/fastfood/stores/store-1/menu')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Add option to menu item returns 201', async () => {
    ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItem)
    ;(mockDb.store.findUnique as MockFn).mockResolvedValue({ ...mockStore, category: 'comida' })
    ;(mockDb.menuOption.create as MockFn).mockResolvedValue(mockOption)

    const res = await request('POST', '/api/v1/fastfood/menu/menu-1/options', {
      name: 'Tamaño', type: 'single', required: true,
      choices: [{ name: 'Grande', priceModifier: 1.50 }, { name: 'Pequeño', priceModifier: 0 }],
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Tamaño')
  })

  it('Get preparation time returns 200', async () => {
    ;(mockDb.menuItem.aggregate as MockFn).mockResolvedValue({ _avg: { preparationTime: 15 } })

    const res = await request('GET', '/api/v1/fastfood/stores/store-1/preparation-time')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.averagePreparationTime).toBe(15)
  })
})

describe('Assistant', () => {
  it('Send message returns 200', async () => {
    ;(mockDb.conversation.create as MockFn).mockResolvedValue(mockConversation)
    ;(mockDb.message.create as MockFn).mockResolvedValue(mockMessage)
    ;(mockDb.message.findMany as MockFn).mockResolvedValue([mockMessage])

    const res = await request('POST', '/api/v1/assistant/chat', { message: 'Hola' }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.conversationId).toBeDefined()
    expect(res.body.data.reply).toBeDefined()
    expect(Array.isArray(res.body.data.suggestedActions)).toBe(true)
  })

  it('Send message to existing conversation returns 200', async () => {
    ;(mockDb.conversation.findUnique as MockFn).mockResolvedValue(mockConversation)
    ;(mockDb.message.create as MockFn).mockResolvedValue(mockMessage)
    ;(mockDb.message.findMany as MockFn).mockResolvedValue([
      { id: 'msg-1', role: 'user', content: 'Hola', createdAt: new Date() },
      { id: 'msg-2', role: 'assistant', content: 'Respuesta', createdAt: new Date() },
    ])

    const res = await request('POST', '/api/v1/assistant/chat', { conversationId: 'conv-1', message: '¿Cómo compro?' }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.conversationId).toBe('conv-1')
  })

  it('Send message to another user conversation returns 404', async () => {
    ;(mockDb.conversation.findUnique as MockFn).mockResolvedValue({
      ...mockConversation, userId: 'other-user',
    })

    const res = await request('POST', '/api/v1/assistant/chat', { conversationId: 'conv-1', message: 'Hola' }, clienteToken)

    expect(res.status).toBe(404)
  })

  it('Send message without message returns 400', async () => {
    const res = await request('POST', '/api/v1/assistant/chat', {}, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('List conversations returns 200', async () => {
    ;(mockDb.conversation.findMany as MockFn).mockResolvedValue([mockConversation])

    const res = await request('GET', '/api/v1/assistant/conversations', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data[0].lastMessage).toBeDefined()
  })

  it('Get conversation messages returns 200', async () => {
    ;(mockDb.conversation.findUnique as MockFn).mockResolvedValue({
      ...mockConversation,
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hola', createdAt: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Respuesta', createdAt: new Date() },
      ],
    })

    const res = await request('GET', '/api/v1/assistant/conversations/conv-1', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.messages.length).toBe(2)
  })

  it('Get conversation messages for another user returns 403', async () => {
    ;(mockDb.conversation.findUnique as MockFn).mockResolvedValue({
      ...mockConversation, userId: 'other-user',
    })

    const res = await request('GET', '/api/v1/assistant/conversations/conv-1', undefined, clienteToken)

    expect(res.status).toBe(403)
  })
})
