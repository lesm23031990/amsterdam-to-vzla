export interface MockProduct {
  id: string
  brandId: string | null
  name: string
  description: string | null
  priceCop: number
  price: number
  currency: string
  category: string | null
  images: string[]
  stock: number
  isActive: boolean
  isFeatured: boolean
  hasDiscount: boolean
  discountPercent: number
  soldCount: number
  specifications: unknown[] | null
  badges: unknown[] | null
  createdAt: string
  updatedAt: string
  brand?: { id: string; name: string; slug: string; logoImage: string | null } | null
}

export interface MockBrand {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  logoImage: string | null
  isActive: boolean
  productCount: number
}

export interface MockCartItem {
  id: string
  cartId: string
  productId: string
  quantity: number
  price: number
  product?: MockProduct
}

export interface MockCart {
  id: string
  userId: string
  items: MockCartItem[]
}

export interface MockOrderItem {
  id: string
  orderId: string
  productId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface MockOrder {
  id: string
  userId: string
  status: string
  total: number
  totalCop: number
  deliveryFee: number
  currency: string
  paymentMethod: string
  paymentStatus: string
  paymentRef: string | null
  paymentUrl: string | null
  paymentProof: string | null
  deliveryAddress: string | null
  notes: string | null
  contactPhone: string | null
  createdAt: string
  updatedAt: string
  items: MockOrderItem[]
  delivery?: {
    id: string
    orderId: string
    driverId: string
    status: string
    driver: { id: string; name: string; phone: string | null }
    locations: { id: string; deliveryId: string; lat: number; lng: number; createdAt: string }[]
  } | null
}

export interface MockExchangeRate {
  id: string
  currency: string
  rate: number
}

export interface MockUser {
  id: string
  email: string
  password: string
  name: string
  phone: string | null
  role: string
  createdAt: string
  updatedAt: string
}

export interface MockMenuItem {
  id: string
  name: string
  description: string | null
  basePrice: number
  currency: string
  category: string | null
  image: string | null
  preparationTime: number
  isAvailable: boolean
  options: {
    id: string
    menuItemId: string
    name: string
    type: string
    required: boolean
    choices: {
      id: string
      menuOptionId: string
      name: string
      priceModifier: number
    }[]
  }[]
}

export interface MockProductComment {
  id: string
  productId: string
  userId: string
  type: string
  content: string
  images: string[]
  rating: number | null
  parentId: string | null
  resolved: boolean
  reactions: Record<string, number>
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string }
  replies?: MockProductComment[]
}

export interface MockNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  data: unknown
  orderId: string | null
  createdAt: string
}

export interface MockConversation {
  id: string
  userId: string
  messages: { id: string; conversationId: string; role: string; content: string; createdAt: string }[]
}

// ==================== BRANDS ====================

export const brands: MockBrand[] = [
  { id: 'brand-1', name: 'Amsterdam Foods', slug: 'amsterdam-foods', description: 'Marca principal de productos congelados', phone: '+58 276-1234567', logoImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop', isActive: true, productCount: 12 },
  { id: 'brand-2', name: 'QuickSnack', slug: 'quicksnack', description: 'Snacks y porciones listas para freír', phone: '+58 276-2345678', logoImage: null, isActive: true, productCount: 8 },
  { id: 'brand-3', name: 'FreezeMax', slug: 'freezemax', description: 'Insumos congelados para restaurantes', phone: null, logoImage: null, isActive: true, productCount: 5 },
]

// ==================== PRODUCTS ====================

export const products: MockProduct[] = [
  { id: '1', brandId: 'brand-1', name: 'Tequeños de Queso', description: 'Caja x24 unidades', priceCop: 5.50, price: 5.50, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop'], stock: 120, isActive: true, isFeatured: true, hasDiscount: false, discountPercent: 0, soldCount: 340, specifications: null, badges: [{ type: 'best-seller', label: 'Más vendido' }], createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', brand: brands[0] },
  { id: '2', brandId: 'brand-1', name: 'Pastelitos de Pollo', description: 'Caja x18 unidades', priceCop: 4.80, price: 4.80, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop'], stock: 85, isActive: true, isFeatured: true, hasDiscount: false, discountPercent: 0, soldCount: 210, specifications: null, badges: [], createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', brand: brands[0] },
  { id: '3', brandId: 'brand-2', name: 'Mini Pizzas', description: 'Caja x12 unidades', priceCop: 7.00, price: 7.00, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop'], stock: 60, isActive: true, isFeatured: true, hasDiscount: false, discountPercent: 0, soldCount: 150, specifications: null, badges: [{ type: 'new', label: 'Nuevo' }], createdAt: '2024-02-01T10:00:00Z', updatedAt: '2024-02-01T10:00:00Z', brand: brands[1] },
  { id: '4', brandId: 'brand-1', name: 'Nuggets de Pollo', description: 'Bolsa x500g', priceCop: 6.20, price: 6.20, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1618413409033-68c4ac6b4e95?w=600&h=400&fit=crop'], stock: 95, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 180, specifications: null, badges: [], createdAt: '2024-01-20T10:00:00Z', updatedAt: '2024-01-20T10:00:00Z', brand: brands[0] },
  { id: '5', brandId: 'brand-2', name: 'Croquetas de Jamón', description: 'Caja x30 unidades', priceCop: 3.90, price: 3.90, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop'], stock: 200, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 120, specifications: null, badges: [], createdAt: '2024-01-25T10:00:00Z', updatedAt: '2024-01-25T10:00:00Z', brand: brands[1] },
  { id: '6', brandId: 'brand-1', name: 'Empanadas de Carne', description: 'Caja x12 unidades', priceCop: 6.20, price: 6.20, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600&h=400&fit=crop'], stock: 45, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 90, specifications: null, badges: [], createdAt: '2024-02-05T10:00:00Z', updatedAt: '2024-02-05T10:00:00Z', brand: brands[0] },
  { id: '7', brandId: 'brand-2', name: 'Deditos de Queso', description: 'Caja x18 unidades', priceCop: 4.50, price: 4.50, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop'], stock: 150, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 75, specifications: null, badges: [], createdAt: '2024-02-10T10:00:00Z', updatedAt: '2024-02-10T10:00:00Z', brand: brands[1] },
  { id: '8', brandId: 'brand-3', name: 'Papas Fritas Congeladas', description: 'Bolsa x2kg', priceCop: 3.20, price: 3.20, currency: 'USD', category: 'insumos', images: ['https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop'], stock: 180, isActive: true, isFeatured: false, hasDiscount: true, discountPercent: 36, soldCount: 300, specifications: null, badges: [{ type: 'offer', label: 'Oferta' }], createdAt: '2024-02-15T10:00:00Z', updatedAt: '2024-02-15T10:00:00Z', brand: brands[2] },
  { id: '9', brandId: 'brand-1', name: 'Hamburguesas Listas', description: 'Pack x12 unidades', priceCop: 9.50, price: 9.50, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop'], stock: 90, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 65, specifications: null, badges: [], createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-01T10:00:00Z', brand: brands[0] },
  { id: '10', brandId: 'brand-2', name: 'Palitos de Mozzarella', description: 'Caja x20 unidades', priceCop: 5.00, price: 5.00, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop'], stock: 75, isActive: true, isFeatured: false, hasDiscount: false, discountPercent: 0, soldCount: 55, specifications: null, badges: [], createdAt: '2024-03-05T10:00:00Z', updatedAt: '2024-03-05T10:00:00Z', brand: brands[1] },
  { id: '11', brandId: 'brand-3', name: 'Aros de Cebolla', description: 'Bolsa x500g', priceCop: 4.20, price: 4.20, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=400&fit=crop'], stock: 110, isActive: true, isFeatured: false, hasDiscount: true, discountPercent: 35, soldCount: 45, specifications: null, badges: [{ type: 'offer', label: 'Oferta' }], createdAt: '2024-03-10T10:00:00Z', updatedAt: '2024-03-10T10:00:00Z', brand: brands[2] },
  { id: '12', brandId: 'brand-1', name: 'Alitas de Pollo', description: 'Bolsa x1kg', priceCop: 7.50, price: 7.50, currency: 'USD', category: 'congelados', images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop'], stock: 65, isActive: true, isFeatured: false, hasDiscount: true, discountPercent: 32, soldCount: 130, specifications: null, badges: [{ type: 'offer', label: 'Oferta' }], createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:00:00Z', brand: brands[0] },
]

// ==================== MENU ITEMS (Fast Food) ====================

export const menuItems: MockMenuItem[] = [
  {
    id: 'menu-1', name: 'Combo Hamburguesa', description: 'Hamburguesa + papas + refresco', basePrice: 8.50, currency: 'USD', category: 'combos', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', preparationTime: 15, isAvailable: true,
    options: [
      { id: 'opt-1', menuItemId: 'menu-1', name: 'Tamaño', type: 'single', required: true, choices: [{ id: 'ch-1', menuOptionId: 'opt-1', name: 'Regular', priceModifier: 0 }, { id: 'ch-2', menuOptionId: 'opt-1', name: 'Doble', priceModifier: 3 }] },
      { id: 'opt-2', menuItemId: 'menu-1', name: 'Extras', type: 'multiple', required: false, choices: [{ id: 'ch-3', menuOptionId: 'opt-2', name: 'Tocineta', priceModifier: 1.5 }, { id: 'ch-4', menuOptionId: 'opt-2', name: 'Queso extra', priceModifier: 1 }] },
    ],
  },
  { id: 'menu-2', name: 'Papas Fritas Grande', description: 'Porción grande de papas fritas', basePrice: 3.00, currency: 'USD', category: 'acompañantes', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop', preparationTime: 8, isAvailable: true, options: [] },
  { id: 'menu-3', name: 'Tequeños (porción 12)', description: '12 tequeños de queso crujientes', basePrice: 4.00, currency: 'USD', category: 'entradas', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop', preparationTime: 10, isAvailable: true, options: [] },
  { id: 'menu-4', name: 'Pizza Personal', description: 'Pizza personal de pepperoni', basePrice: 6.00, currency: 'USD', category: 'pizzas', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', preparationTime: 12, isAvailable: true, options: [] },
]

// ==================== EXCHANGE RATES ====================

export const exchangeRates: MockExchangeRate[] = [
  { id: 'rate-1', currency: 'USD', rate: 1 },
  { id: 'rate-2', currency: 'Bs', rate: 36.50 },
]

// ==================== USERS ====================

export const users: MockUser[] = [
  { id: 'user-1', email: 'demo@amsterdam.com', password: '$2a$12$demo', name: 'Cliente Demo', phone: '+58 414-1234567', role: 'cliente', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'user-2', email: 'admin@amsterdam.com', password: '$2a$12$demo', name: 'Admin Amsterdam', phone: '+58 412-7654321', role: 'admin', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'user-3', email: 'carlos@amsterdam.com', password: '$2a$12$demo', name: 'Carlos M.', phone: '+58 414-1234567', role: 'cliente', createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-05T00:00:00Z' },
]

// ==================== CART ====================

export const carts: MockCart[] = [
  { id: 'cart-1', userId: 'user-1', items: [] },
  { id: 'cart-2', userId: 'user-3', items: [] },
]

// ==================== ORDERS ====================

export const orders: MockOrder[] = [
  {
    id: 'order-1', userId: 'user-1', status: 'in_transit', total: 18.70, totalCop: 18.70, deliveryFee: 2.50, currency: 'USD', paymentMethod: 'transfer', paymentStatus: 'pending_review', paymentRef: 'REF-2024-001', paymentUrl: null, paymentProof: null,
    deliveryAddress: 'Av. Principal, Barrio Obrero, San Cristóbal', notes: 'Entregar en la esquina de la panadería', contactPhone: '+58 414-1234567',
    createdAt: '2024-03-20T14:30:00Z', updatedAt: '2024-03-20T15:00:00Z',
    items: [
      { id: 'oi-1', orderId: 'order-1', productId: '1', name: 'Tequeños de Queso', price: 5.50, quantity: 2, subtotal: 11.00 },
      { id: 'oi-2', orderId: 'order-1', productId: '8', name: 'Papas Fritas Congeladas', price: 3.20, quantity: 1, subtotal: 3.20 },
      { id: 'oi-3', orderId: 'order-1', productId: '10', name: 'Palitos de Mozzarella', price: 5.00, quantity: 1, subtotal: 5.00 },
    ],
    delivery: {
      id: 'del-1', orderId: 'order-1', driverId: 'user-3', status: 'in_transit',
      driver: { id: 'user-3', name: 'Carlos M.', phone: '+58 414-1234567' },
      locations: [
        { id: 'loc-1', deliveryId: 'del-1', lat: 7.8135, lng: -72.2210, createdAt: '2024-03-20T15:00:00Z' },
      ],
    },
  },
  {
    id: 'order-2', userId: 'user-1', status: 'preparing', total: 21.00, totalCop: 21.00, deliveryFee: 0, currency: 'USD', paymentMethod: 'binance_pay', paymentStatus: 'pending', paymentRef: null, paymentUrl: 'https://mock.binance.com/pay/temp-user-1-123', paymentProof: null,
    deliveryAddress: 'Calle 5, Sector La Concordia, San Cristóbal', notes: '', contactPhone: '+58 414-1234567',
    createdAt: '2024-03-20T16:00:00Z', updatedAt: '2024-03-20T16:00:00Z',
    items: [
      { id: 'oi-4', orderId: 'order-2', productId: '3', name: 'Mini Pizzas', price: 7.00, quantity: 3, subtotal: 21.00 },
    ],
    delivery: null,
  },
  {
    id: 'order-3', userId: 'user-1', status: 'delivered', total: 10.70, totalCop: 10.70, deliveryFee: 2.50, currency: 'USD', paymentMethod: 'cash', paymentStatus: 'paid', paymentRef: 'EF-2024-003', paymentUrl: null, paymentProof: null,
    deliveryAddress: 'Av. Principal, Barrio Obrero, San Cristóbal', notes: '', contactPhone: '+58 414-1234567',
    createdAt: '2024-03-19T15:00:00Z', updatedAt: '2024-03-19T16:30:00Z',
    items: [
      { id: 'oi-5', orderId: 'order-3', productId: '6', name: 'Empanadas de Carne', price: 6.20, quantity: 1, subtotal: 6.20 },
      { id: 'oi-6', orderId: 'order-3', productId: '7', name: 'Deditos de Queso', price: 4.50, quantity: 1, subtotal: 4.50 },
    ],
    delivery: {
      id: 'del-2', orderId: 'order-3', driverId: 'user-3', status: 'delivered',
      driver: { id: 'user-3', name: 'Carlos M.', phone: '+58 414-1234567' },
      locations: [],
    },
  },
]

// ==================== PRODUCT COMMENTS ====================

export const productComments: MockProductComment[] = [
  {
    id: 'comment-1', productId: '1', userId: 'user-3', type: 'comment', content: 'Los mejores tequeños de San Cristóbal! Siempre frescos y crujientes.', images: [], rating: 5, parentId: null, resolved: false, reactions: { helpful: 3 }, createdAt: '2024-03-18T10:00:00Z', updatedAt: '2024-03-18T10:00:00Z',
    user: { id: 'user-3', name: 'Carlos M.', email: 'carlos@amsterdam.com' },
    replies: [
      { id: 'reply-1', productId: '1', userId: 'user-2', type: 'reply', content: '¡Gracias Carlos! Nos alegra que te gusten. ❄️', images: [], rating: null, parentId: 'comment-1', resolved: false, reactions: { helpful: 1 }, createdAt: '2024-03-18T11:00:00Z', updatedAt: '2024-03-18T11:00:00Z', user: { id: 'user-2', name: 'Admin Amsterdam', email: 'admin@amsterdam.com' }, replies: [] },
    ],
  },
  {
    id: 'comment-2', productId: '1', userId: 'user-1', type: 'question', content: '¿Hacen delivery los domingos?', images: [], rating: null, parentId: null, resolved: true, reactions: {}, createdAt: '2024-03-17T09:00:00Z', updatedAt: '2024-03-17T10:00:00Z',
    user: { id: 'user-1', name: 'Cliente Demo', email: 'demo@amsterdam.com' },
    replies: [
      { id: 'reply-2', productId: '1', userId: 'user-2', type: 'reply', content: 'Sí, hacemos delivery de lunes a domingo de 8am a 8pm.', images: [], rating: null, parentId: 'comment-2', resolved: false, reactions: {}, createdAt: '2024-03-17T09:30:00Z', updatedAt: '2024-03-17T09:30:00Z', user: { id: 'user-2', name: 'Admin Amsterdam', email: 'admin@amsterdam.com' }, replies: [] },
    ],
  },
  {
    id: 'comment-3', productId: '3', userId: 'user-3', type: 'comment', content: 'Las mini pizzas son perfectas para fiestas, rinden mucho.', images: [], rating: 4, parentId: null, resolved: false, reactions: { helpful: 2 }, createdAt: '2024-03-16T14:00:00Z', updatedAt: '2024-03-16T14:00:00Z',
    user: { id: 'user-3', name: 'Carlos M.', email: 'carlos@amsterdam.com' },
    replies: [],
  },
]

// ==================== NOTIFICATIONS ====================

export const notifications: MockNotification[] = [
  { id: 'notif-1', userId: 'user-1', type: 'order_status', title: 'Pedido en camino', message: 'Tu pedido #order-1 ha salido hacia tu dirección', read: false, data: { orderId: 'order-1', status: 'in_transit' }, orderId: 'order-1', createdAt: '2024-03-20T15:00:00Z' },
  { id: 'notif-2', userId: 'user-1', type: 'promo', title: 'Oferta especial', message: '30% de descuento en Papas Fritas Congeladas solo hoy', read: false, data: { productId: '8' }, orderId: null, createdAt: '2024-03-20T10:00:00Z' },
  { id: 'notif-3', userId: 'user-1', type: 'order_status', title: 'Pedido entregado', message: 'Tu pedido #order-3 ha sido entregado exitosamente', read: true, data: { orderId: 'order-3', status: 'delivered' }, orderId: 'order-3', createdAt: '2024-03-19T16:30:00Z' },
]

// ==================== CONVERSATIONS (AI Assistant) ====================

export const conversations: MockConversation[] = [
  {
    id: 'conv-1', userId: 'user-1',
    messages: [
      { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: '¿Cuál es el pedido mínimo para delivery gratis?', createdAt: '2024-03-20T14:00:00Z' },
      { id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: '¡Hola! El pedido mínimo para delivery gratis es de $10 USD. Si tu pedido es menor, el costo de delivery es de $2.50. ¿Te puedo ayudar con algo más?', createdAt: '2024-03-20T14:00:05Z' },
    ],
  },
]

// ==================== ORDER NUMBER SEQUENCE ====================

let orderCounter = orders.length + 1

export function nextOrderId(): string {
  return `order-${orderCounter++}`
}

// ==================== CART ITEM SEQUENCE ====================

let cartItemCounter = 1

export function nextCartItemId(): string {
  return `ci-${cartItemCounter++}`
}
