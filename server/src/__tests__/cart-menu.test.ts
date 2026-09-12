import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index'
import http from 'http'
import jwt from 'jsonwebtoken'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    brand: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    productComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    productReport: { findUnique: vi.fn(), create: vi.fn() },
    stockNotification: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    menuItemComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    cart: { findUnique: vi.fn(), upsert: vi.fn() },
    cartItem: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn() },
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

const mockCart = {
  id: 'cart-1', userId: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockProduct = {
  id: 'product-1', brandId: 'brand-1', name: 'Producto Test', description: 'Descripción',
  priceCop: 107100, price: 25.50, currency: 'COP', category: 'congelados', images: [], stock: 100,
  isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

const mockMenuItemFull = {
  id: 'menu-1', name: 'Hamburguesa', description: 'Deliciosa', basePrice: 8.50,
  currency: 'USD', category: 'comida rápida', image: null, preparationTime: 15, isAvailable: true,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  options: [
    {
      id: 'opt-1', menuItemId: 'menu-1', name: 'Tamaño', type: 'single', required: true,
      choices: [
        { id: 'choice-1', menuOptionId: 'opt-1', name: 'Mediana', priceModifier: 0 },
        { id: 'choice-2', menuOptionId: 'opt-1', name: 'Grande', priceModifier: 1.50 },
      ],
    },
    {
      id: 'opt-2', menuItemId: 'menu-1', name: 'Extras', type: 'multiple', required: false,
      choices: [
        { id: 'choice-3', menuOptionId: 'opt-2', name: 'Queso', priceModifier: 1.00 },
      ],
    },
  ],
}

const mockMenuItemCartItem = {
  id: 'ci-menu-1', cartId: 'cart-1', productId: null, menuItemId: 'menu-1',
  quantity: 1, price: 11.00,
  customizations: [
    { optionId: 'opt-1', choiceId: 'choice-2', optionName: 'Tamaño', choiceName: 'Grande', priceModifier: 1.50 },
    { optionId: 'opt-2', choiceId: 'choice-3', optionName: 'Extras', choiceName: 'Queso', priceModifier: 1.00 },
  ],
  createdAt: new Date('2024-01-01'),
}

const mockOrder = {
  id: 'order-1', userId: 'user-1', status: 'confirmed', total: 107122,
  totalCop: 107122, deliveryFee: 0, currency: 'COP', paymentMethod: 'cash', paymentStatus: 'pending',
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockDb.exchangeRate.findMany as MockFn).mockResolvedValue([
    { id: 'r1', currency: 'Bs', rate: 36.50, updatedAt: new Date() },
    { id: 'r2', currency: 'USD', rate: 0.024, updatedAt: new Date() },
  ])
  ;(mockDb.notification.create as MockFn).mockResolvedValue({ id: 'n1' })
  ;(mockDb.cart.upsert as MockFn).mockResolvedValue(mockCart)
  ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue(mockMenuItemFull)
})

describe('Cart — menu items', () => {
  it('adds a menu item with server-computed price including modifiers', async () => {
    ;(mockDb.cartItem.findMany as MockFn).mockResolvedValue([])
    ;(mockDb.cartItem.create as MockFn).mockResolvedValue(mockMenuItemCartItem)

    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-1', choiceId: 'choice-2' },
        { optionId: 'opt-2', choiceId: 'choice-3' },
      ],
    }, clienteToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(mockDb.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'cart-1',
          menuItemId: 'menu-1',
          price: 11.00,
          customizations: expect.arrayContaining([
            expect.objectContaining({ optionName: 'Tamaño', choiceName: 'Grande', priceModifier: 1.50 }),
            expect.objectContaining({ optionName: 'Extras', choiceName: 'Queso', priceModifier: 1.00 }),
          ]),
        }),
      })
    )
  })

  it('rejects a choice that belongs to another option', async () => {
    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-1', choiceId: 'choice-2' },
        { optionId: 'opt-2', choiceId: 'choice-2' },
      ],
    }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('opción')
    expect(mockDb.cartItem.create).not.toHaveBeenCalled()
  })

  it('rejects when a required option group has no choice', async () => {
    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-2', choiceId: 'choice-3' },
      ],
    }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toContain('Tamaño')
    expect(mockDb.cartItem.create).not.toHaveBeenCalled()
  })

  it('rejects more than one choice in a single-type group', async () => {
    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-1', choiceId: 'choice-1' },
        { optionId: 'opt-1', choiceId: 'choice-2' },
      ],
    }, clienteToken)

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(mockDb.cartItem.create).not.toHaveBeenCalled()
  })

  it('returns 404 for unavailable menu item', async () => {
    ;(mockDb.menuItem.findUnique as MockFn).mockResolvedValue({ ...mockMenuItemFull, isAvailable: false })

    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1', quantity: 1,
      customizations: [{ optionId: 'opt-1', choiceId: 'choice-1' }],
    }, clienteToken)

    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('merges quantity into existing line when choice set is identical', async () => {
    ;(mockDb.cartItem.findMany as MockFn).mockResolvedValue([{ ...mockMenuItemCartItem, quantity: 2 }])
    ;(mockDb.cartItem.update as MockFn).mockResolvedValue({ ...mockMenuItemCartItem, quantity: 3 })

    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-2', choiceId: 'choice-3' },
        { optionId: 'opt-1', choiceId: 'choice-2' },
      ],
    }, clienteToken)

    expect(res.status).toBe(201)
    expect(mockDb.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ci-menu-1' }, data: { quantity: 3 } })
    )
    expect(mockDb.cartItem.create).not.toHaveBeenCalled()
  })

  it('creates a new line when customizations differ', async () => {
    ;(mockDb.cartItem.findMany as MockFn).mockResolvedValue([{ ...mockMenuItemCartItem, quantity: 2 }])
    ;(mockDb.cartItem.create as MockFn).mockResolvedValue({ ...mockMenuItemCartItem, id: 'ci-menu-2' })

    const res = await request('POST', '/api/v1/cart/items', {
      menuItemId: 'menu-1',
      quantity: 1,
      customizations: [
        { optionId: 'opt-1', choiceId: 'choice-1' },
      ],
    }, clienteToken)

    expect(res.status).toBe(201)
    expect(mockDb.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          menuItemId: 'menu-1',
          price: 8.50,
          customizations: [{ optionId: 'opt-1', choiceId: 'choice-1', optionName: 'Tamaño', choiceName: 'Mediana', priceModifier: 0 }],
        }),
      })
    )
    expect(mockDb.cartItem.update).not.toHaveBeenCalled()
  })

  it('keeps product flow working and rejects missing ids', async () => {
    ;(mockDb.product.findUnique as MockFn).mockResolvedValue(mockProduct)
    ;(mockDb.cartItem.findFirst as MockFn).mockResolvedValue(null)
    ;(mockDb.cartItem.create as MockFn).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'product-1', menuItemId: null, quantity: 2, price: 25.50, customizations: null })

    const ok = await request('POST', '/api/v1/cart/items', { productId: 'product-1', quantity: 2 }, clienteToken)
    expect(ok.status).toBe(201)
    expect(ok.body.data.productId).toBe('product-1')

    const bad = await request('POST', '/api/v1/cart/items', { quantity: 1 }, clienteToken)
    expect(bad.status).toBe(400)
    expect(bad.body.ok).toBe(false)
  })

  it('GET /cart marks items with derived type and exposes menuItem + customizations', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue({
      ...mockCart,
      items: [
        {
          id: 'ci-1', cartId: 'cart-1', productId: 'product-1', menuItemId: null,
          quantity: 2, price: 25.50, customizations: null, createdAt: new Date('2024-01-01'),
          product: { ...mockProduct, brand: { id: 'brand-1', name: 'Tiffany Foods', slug: 'tiffany-foods', logoImage: null } },
          menuItem: null,
        },
        {
          ...mockMenuItemCartItem,
          product: null,
          menuItem: { id: 'menu-1', name: 'Hamburguesa', image: null, preparationTime: 15, category: 'comida rápida' },
        },
      ],
    })

    const res = await request('GET', '/api/v1/cart', undefined, clienteToken)

    expect(res.status).toBe(200)
    const [productLine, menuLine] = res.body.data.items
    expect(productLine.type).toBe('product')
    expect(productLine.product.brand.name).toBe('Tiffany Foods')
    expect(menuLine.type).toBe('menu')
    expect(menuLine.menuItem).toEqual({ id: 'menu-1', name: 'Hamburguesa', image: null, preparationTime: 15, category: 'comida rápida' })
    expect(menuLine.customizations).toHaveLength(2)
    expect(res.body.data.total).toBeCloseTo(2 * 25.50 + 11.00)
  })

  it('PATCH quantity on a menu item skips stock validation', async () => {
    ;(mockDb.cartItem.findUnique as MockFn).mockResolvedValue({
      ...mockMenuItemCartItem,
      cart: mockCart,
      product: null,
    })
    ;(mockDb.cartItem.update as MockFn).mockResolvedValue({ ...mockMenuItemCartItem, quantity: 4 })

    const res = await request('PATCH', '/api/v1/cart/items/ci-menu-1', { quantity: 4 }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.quantity).toBe(4)
  })
})

describe('Checkout — mixed product + menu', () => {
  it('creates order with product and menu order items', async () => {
    ;(mockDb.cart.findUnique as MockFn).mockResolvedValue({
      ...mockCart,
      items: [
        {
          id: 'ci-1', cartId: 'cart-1', productId: 'product-1', menuItemId: null,
          quantity: 2, price: 25.50, customizations: null,
          product: { id: 'product-1', name: 'Producto Test', priceCop: 107100 },
          menuItem: null,
        },
        {
          ...mockMenuItemCartItem,
          quantity: 2,
          product: null,
          menuItem: { id: 'menu-1', name: 'Hamburguesa' },
        },
      ],
    })
    ;(mockDb.order.create as MockFn).mockResolvedValue(mockOrder)
    ;(mockDb.cartItem.deleteMany as MockFn).mockResolvedValue({ count: 2 })

    const res = await request('POST', '/api/v1/checkout', {
      paymentMethod: 'cash', deliveryAddress: 'San Cristóbal', contactPhone: '+584241234567',
    }, clienteToken)

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalCop: 107100 * 2 + 11.00 * 2,
          items: expect.objectContaining({
            create: [
              expect.objectContaining({
                productId: 'product-1',
                name: 'Producto Test',
                price: 107100,
                quantity: 2,
                subtotal: 214200,
              }),
              expect.objectContaining({
                menuItemId: 'menu-1',
                name: 'Hamburguesa',
                price: 11.00,
                quantity: 2,
                subtotal: 22.00,
                customizations: mockMenuItemCartItem.customizations,
              }),
            ],
          }),
        }),
      })
    )
    const created = (mockDb.order.create as MockFn).mock.calls[0][0].data.items.create
    expect(created[1]).not.toHaveProperty('productId')
  })
})
