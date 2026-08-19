import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index'
import http from 'http'
import jwt from 'jsonwebtoken'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    brand: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    cart: { findUnique: vi.fn(), upsert: vi.fn() },
    cartItem: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    delivery: { findUnique: vi.fn(), create: vi.fn() },
    deliveryLocation: { create: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    menuOption: { create: vi.fn() },
    conversation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    exchangeRate: { findMany: vi.fn(), upsert: vi.fn() },
    notification: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
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

const mockBrand = {
  id: 'brand-1', name: 'Tiffany Foods', slug: 'tiffany-foods', description: 'Productos congelados',
  phone: '+584241234567', logoImage: null, isActive: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockProduct = {
  id: 'product-1', brandId: 'brand-1', name: 'Producto Test', description: 'Descripción',
  priceCop: 107100, price: 25.50, currency: 'COP', category: 'congelados', images: [], stock: 100,
  isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockCart = {
  id: 'cart-1', userId: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockCartItem = {
  id: 'ci-1', cartId: 'cart-1', productId: 'product-1', quantity: 2, price: 25.50, createdAt: new Date('2024-01-01'),
}

const mockOrder = {
  id: 'order-1', userId: 'user-1', status: 'pending_payment', total: 51.00,
  deliveryFee: 5.00,
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
  id: 'menu-1', name: 'Hamburguesa', description: 'Deliciosa', basePrice: 8.50,
  currency: 'USD', category: 'comida rápida', image: null, preparationTime: 15, isAvailable: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockOption = {
  id: 'opt-1', menuItemId: 'menu-1', name: 'Tamaño', type: 'single', required: true,
  createdAt: new Date('2024-01-01'),
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
  ;(mockDb.exchangeRate.findMany as MockFn).mockResolvedValue([
    { id: 'r1', currency: 'Bs', rate: 36.50, updatedAt: new Date() },
    { id: 'r2', currency: 'USD', rate: 0.024, updatedAt: new Date() },
  ])
  ;(mockDb.notification.create as MockFn).mockResolvedValue({ id: 'n1' })
})

describe('Auth', () => {
  it('Register with valid data returns 201', async () => {
    (mockDb.user.findUnique as MockFn).mockResolvedValue(null)
    ;(bcrypt.hash as MockFn).mockResolvedValue('hashed_password')
    ;(mockDb.user.create as MockFn).mockResolvedValue(mockUser)

    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@test.com', password: 'SecurePass123!', name: 'Test User', phone: '+584241234567',
    })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe('test@test.com')
  })

  it('Register with duplicate email returns 409', async () => {
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue(mockUser)

    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@test.com', password: 'SecurePass123!', name: 'Test User',
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

describe('Brands', () => {
  it('Create brand with valid data returns 201', async () => {
    ;(mockDb.brand.findUnique as MockFn).mockResolvedValue(null)
    ;(mockDb.brand.create as MockFn).mockResolvedValue(mockBrand)

    const res = await request('POST', '/api/v1/brands', {
      name: 'Tiffany Foods', description: 'Productos congelados', phone: '+584241234567',
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.slug).toBe('tiffany-foods')
  })

  it('Create brand without admin role returns 403', async () => {
    const res = await request('POST', '/api/v1/brands', {
      name: 'Tiffany Foods',
    }, clienteToken)

    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('List brands returns 200', async () => {
    ;(mockDb.brand.findMany as MockFn).mockResolvedValue([{ ...mockBrand, _count: { products: 10 } }])

    const res = await request('GET', '/api/v1/brands')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Get brand by slug returns 200', async () => {
    ;(mockDb.brand.findUnique as MockFn).mockResolvedValue({ ...mockBrand, _count: { products: 10 } })

    const res = await request('GET', '/api/v1/brands/tiffany-foods')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.slug).toBe('tiffany-foods')
  })

  it('Get brand by slug returns 404 when not found', async () => {
    ;(mockDb.brand.findUnique as MockFn).mockResolvedValue(null)

    const res = await request('GET', '/api/v1/brands/not-found')

    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('Update brand returns 200', async () => {
    ;(mockDb.brand.findUnique as MockFn).mockResolvedValue(mockBrand)
    ;(mockDb.brand.update as MockFn).mockResolvedValue({ ...mockBrand, name: 'Updated Brand' })

    const res = await request('PATCH', '/api/v1/brands/brand-1', { name: 'Updated Brand' }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Updated Brand')
  })
})

describe('Products', () => {
  it('Create product with valid data returns 201', async () => {
    ;(mockDb.brand.findUnique as MockFn).mockResolvedValue(mockBrand)
    ;(mockDb.product.create as MockFn).mockResolvedValue(mockProduct)

    const res = await request('POST', '/api/v1/products', {
      name: 'Producto Test', priceCop: 107100, category: 'congelados', stock: 100, brandId: 'brand-1',
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Producto Test')
  })

  it('Create product without admin role returns 403', async () => {
    const res = await request('POST', '/api/v1/products', {
      name: 'Producto Test', price: 25.50,
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

  it('List products filtered by brand returns 200', async () => {
    ;(mockDb.product.findMany as MockFn).mockResolvedValue([mockProduct])
    ;(mockDb.product.count as MockFn).mockResolvedValue(1)

    const res = await request('GET', '/api/v1/products?brand=tiffany-foods')

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('Get product by id returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue({
      ...mockProduct, brand: { id: 'brand-1', name: 'Tiffany Foods', slug: 'tiffany-foods' },
    })

    const res = await request('GET', '/api/v1/products/product-1')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.id).toBe('product-1')
  })

  it('Update product returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
    ;(mockDb.product.update as MockFn).mockResolvedValue({ ...mockProduct, name: 'Updated', price: 30 })

    const res = await request('PATCH', '/api/v1/products/product-1', { name: 'Updated', price: 30 }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Delete product (soft delete) returns 200', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
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

  it('Get cart returns 200', async () => {
    const cartWithItems = {
      ...mockCart,
      items: [{
        ...mockCartItem,
        product: {
          ...mockProduct,
          brand: { id: 'brand-1', name: 'Tiffany Foods', slug: 'tiffany-foods' },
        },
      }],
    }
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(cartWithItems)

    const res = await request('GET', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.total).toBeGreaterThan(0)
    expect(res.body.data.totalItems).toBeGreaterThan(0)
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

  it('Remove item returns 200', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockCartItem, cart: mockCart,
    })
    ;(mockDb.cartItem.delete as MockFn).mockResolvedValue(mockCartItem)

    const res = await request('DELETE', '/api/v1/cart/items/ci-1', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('Clear cart returns 200', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue(mockCart)
    ;(mockDb.cartItem.deleteMany as MockFn).mockResolvedValue({ count: 2 })

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
          id: 'product-1', name: 'Producto Test', priceCop: 107100, price: 25.50,
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
})

describe('Delivery', () => {
  it('Update order status returns 200', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.order.update as MockFn).mockResolvedValue({ ...mockOrder, status: 'confirmed' })

    const res = await request('PATCH', '/api/v1/delivery/orders/order-1/status', { status: 'confirmed' }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('confirmed')
  })

  it('Update order status without auth returns 401', async () => {
    const res = await request('PATCH', '/api/v1/delivery/orders/order-1/status', { status: 'confirmed' })

    expect(res.status).toBe(401)
  })

  it('Assign driver returns 201', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({ ...mockOrder, status: 'confirmed' })
    ;(mockDb.user.findUnique as MockFn).mockResolvedValue({
      id: 'driver-1', role: 'cliente', name: 'Driver', email: 'driver@test.com',
    })
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue(null)
    ;(mockDb.delivery.create as MockFn).mockResolvedValue(mockDelivery)
    ;(mockDb.order.update as MockFn).mockResolvedValue({ ...mockOrder, status: 'preparing' })

    const res = await request('POST', '/api/v1/delivery/orders/order-1/assign', { driverId: 'driver-1' }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('assigned')
  })

  it('Track delivery returns 200', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...mockOrder, status: 'in_transit',
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

  it('Update location returns 200', async () => {
    ;(mockDb.delivery.findUnique as MockFn).mockResolvedValue({
      ...mockDelivery, driver: { id: 'driver-1' },
    })
    ;(mockDb.deliveryLocation.create as MockFn).mockResolvedValue(mockLocation)

    const res = await request('PATCH', '/api/v1/delivery/delivery/delivery-1/location', { lat: 7.7703, lng: -72.2292 }, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('FastFood', () => {
  it('Create menu item returns 201', async () => {
    ;(mockDb.menuItem.create as MockFn).mockResolvedValue(mockMenuItem)

    const res = await request('POST', '/api/v1/fastfood/menu', {
      name: 'Hamburguesa', basePrice: 8.50, description: 'Deliciosa', preparationTime: 15, category: 'comida rápida',
    }, adminToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.name).toBe('Hamburguesa')
  })

  it('List menu items returns 200', async () => {
    ;(mockDb.menuItem.findMany as MockFn).mockResolvedValue([{
      ...mockMenuItem,
      options: [{
        ...mockOption, choices: [{ id: 'choice-1', menuOptionId: 'opt-1', name: 'Grande', priceModifier: 1.50 }],
      }],
    }])

    const res = await request('GET', '/api/v1/fastfood/menu')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Get preparation time returns 200', async () => {
    ;(mockDb.menuItem.aggregate as MockFn).mockResolvedValue({ _avg: { preparationTime: 15 } })

    const res = await request('GET', '/api/v1/fastfood/preparation-time')

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

  it('List conversations returns 200', async () => {
    ;(mockDb.conversation.findMany as MockFn).mockResolvedValue([mockConversation])

    const res = await request('GET', '/api/v1/assistant/conversations', undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('Admin', () => {
  it('GET /admin/users returns 200', async () => {
    ;(mockDb.user.findMany as MockFn).mockResolvedValue([{
      ...mockUser,
      _count: { orders: 5 },
    }])

    const res = await request('GET', '/api/v1/admin/users', undefined, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/orders returns 200', async () => {
    ;(mockDb.order.findMany as MockFn).mockResolvedValue([mockOrder])

    const res = await request('GET', '/api/v1/admin/orders', undefined, adminToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/users without admin role returns 403', async () => {
    const res = await request('GET', '/api/v1/admin/users', undefined, clienteToken)

    expect(res.status).toBe(403)
  })
})
