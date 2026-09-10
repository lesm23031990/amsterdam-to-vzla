import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// IN-MEMORY STORE
// ============================================================

interface User {
  id: string; email: string; password: string; name: string;
  phone: string | null; role: string; createdAt: string; updatedAt: string;
}

interface CartItem {
  id: string; cartId: string; productId: string; quantity: number; price: number;
}

interface Cart { id: string; userId: string; items: CartItem[] }

interface OrderItem {
  id: string; orderId: string; productId: string; name: string;
  price: number; quantity: number; subtotal: number;
}

interface Order {
  id: string; userId: string; status: string; total: number; totalCop: number;
  deliveryFee: number; currency: string; paymentMethod: string; paymentStatus: string;
  paymentRef: string | null; paymentUrl: string | null; paymentProof: string | null;
  deliveryAddress: string | null; notes: string | null; contactPhone: string | null;
  createdAt: string; updatedAt: string; items: OrderItem[];
  delivery: {
    id: string; orderId: string; driverId: string; status: string;
    driver: { id: string; name: string; phone: string | null };
    locations: { id: string; deliveryId: string; lat: number; lng: number; createdAt: string }[];
  } | null;
}

interface Comment {
  id: string; productId: string; userId: string; type: string; content: string;
  images: string[]; rating: number | null; parentId: string | null; resolved: boolean;
  reactions: Record<string, number>; createdAt: string; updatedAt: string;
}

interface Notification {
  id: string; userId: string; type: string; title: string; message: string;
  read: boolean; data: unknown; orderId: string | null; createdAt: string;
}

import {
  brands, products, menuItems, users as seedUsers,
  exchangeRates, AI_RESPONSES, getBrandById, getRateMap, formatPrice,
} from '@/lib/mock-data'

let carts: Cart[] = []
let cartItemCounter = 1
let cartsCounter = 1

let orders: Order[] = [
  {
    id: 'order-1', userId: 'user-1', status: 'in_transit', total: 18.70, totalCop: 18.70, deliveryFee: 2.50, currency: 'USD', paymentMethod: 'transfer', paymentStatus: 'pending_review', paymentRef: 'REF-2024-001', paymentUrl: null, paymentProof: null,
    deliveryAddress: 'Av. Principal, Barrio Obrero, San Cristóbal', notes: 'Entregar en la esquina de la panadería', contactPhone: '+58 414-1234567',
    createdAt: '2024-03-20T14:30:00Z', updatedAt: '2024-03-20T15:00:00Z',
    items: [
      { id: 'oi-1', orderId: 'order-1', productId: '1', name: 'Tequeños de Queso', price: 5.50, quantity: 2, subtotal: 11.00 },
      { id: 'oi-2', orderId: 'order-1', productId: '8', name: 'Papas Fritas Congeladas', price: 3.20, quantity: 1, subtotal: 3.20 },
      { id: 'oi-3', orderId: 'order-1', productId: '10', name: 'Palitos de Mozzarella', price: 5.00, quantity: 1, subtotal: 5.00 },
    ],
    delivery: { id: 'del-1', orderId: 'order-1', driverId: 'user-3', status: 'in_transit', driver: { id: 'user-3', name: 'Carlos M.', phone: '+58 414-1234567' }, locations: [{ id: 'loc-1', deliveryId: 'del-1', lat: 7.8135, lng: -72.2210, createdAt: '2024-03-20T15:00:00Z' }] },
  },
  {
    id: 'order-2', userId: 'user-1', status: 'preparing', total: 21.00, totalCop: 21.00, deliveryFee: 0, currency: 'USD', paymentMethod: 'binance_pay', paymentStatus: 'pending', paymentRef: null, paymentUrl: 'https://mock.binance.com/pay/temp-user-1-123', paymentProof: null,
    deliveryAddress: 'Calle 5, Sector La Concordia, San Cristóbal', notes: '', contactPhone: '+58 414-1234567',
    createdAt: '2024-03-20T16:00:00Z', updatedAt: '2024-03-20T16:00:00Z',
    items: [{ id: 'oi-4', orderId: 'order-2', productId: '3', name: 'Mini Pizzas', price: 7.00, quantity: 3, subtotal: 21.00 }],
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
    delivery: { id: 'del-2', orderId: 'order-3', driverId: 'user-3', status: 'delivered', driver: { id: 'user-3', name: 'Carlos M.', phone: '+58 414-1234567' }, locations: [] },
  },
]
let orderCounter = 4

let comments: Comment[] = [
  { id: 'comment-1', productId: '1', userId: 'user-3', type: 'comment', content: 'Los mejores tequeños de San Cristóbal! Siempre frescos y crujientes.', images: [], rating: 5, parentId: null, resolved: false, reactions: { helpful: 3 }, createdAt: '2024-03-18T10:00:00Z', updatedAt: '2024-03-18T10:00:00Z' },
  { id: 'comment-2', productId: '1', userId: 'user-1', type: 'question', content: '¿Hacen delivery los domingos?', images: [], rating: null, parentId: null, resolved: true, reactions: {}, createdAt: '2024-03-17T09:00:00Z', updatedAt: '2024-03-17T10:00:00Z' },
  { id: 'comment-3', productId: '3', userId: 'user-3', type: 'comment', content: 'Las mini pizzas son perfectas para fiestas, rinden mucho.', images: [], rating: 4, parentId: null, resolved: false, reactions: { helpful: 2 }, createdAt: '2024-03-16T14:00:00Z', updatedAt: '2024-03-16T14:00:00Z' },
]

let notifications: Notification[] = [
  { id: 'notif-1', userId: 'user-1', type: 'order_status', title: 'Pedido en camino', message: 'Tu pedido #order-1 ha salido hacia tu dirección', read: false, data: { orderId: 'order-1', status: 'in_transit' }, orderId: 'order-1', createdAt: '2024-03-20T15:00:00Z' },
  { id: 'notif-2', userId: 'user-1', type: 'promo', title: 'Oferta especial', message: '30% de descuento en Papas Fritas Congeladas solo hoy', read: false, data: { productId: '8' }, orderId: null, createdAt: '2024-03-20T10:00:00Z' },
  { id: 'notif-3', userId: 'user-1', type: 'order_status', title: 'Pedido entregado', message: 'Tu pedido #order-3 ha sido entregado exitosamente', read: true, data: { orderId: 'order-3', status: 'delivered' }, orderId: 'order-3', createdAt: '2024-03-19T16:30:00Z' },
]

let registeredUsers: User[] = []
let notifCounter = 3

// ============================================================
// JWT (simple simulation)
// ============================================================

function signJwt(payload: { userId: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 })).toString('base64url')
  return `${header}.${body}.demo`
}

function verifyJwt(token: string): { userId: string; email: string; role: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    if (payload.exp && Date.now() > payload.exp) return null
    return { userId: payload.userId, email: payload.email, role: payload.role }
  } catch { return null }
}

// ============================================================
// HELPERS
// ============================================================

function getUserById(id: string) { return [...seedUsers, ...registeredUsers].find(u => u.id === id) || null }
function getUserByEmail(email: string) { return [...seedUsers, ...registeredUsers].find(u => u.email === email) || null }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status }) }
function error(msg: string, status = 400) { return NextResponse.json({ ok: false, error: msg }, { status }) }
function extractAuth(req: NextRequest) {
  const h = req.headers.get('authorization')
  if (!h || !h.startsWith('Bearer ')) return null
  return verifyJwt(h.split(' ')[1])
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

async function handleLogin(body: any) {
  const { email, password } = body
  if (!email || !password) return error('Email y contraseña son requeridos', 400)
  const user = getUserByEmail(email)
  if (!user || user.password !== password) return error('Credenciales inválidas', 401)
  const token = signJwt({ userId: user.id, email: user.email, role: user.role })
  return json({ ok: true, data: { user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role }, token } })
}

async function handleRegister(body: any) {
  const { email, password, name, phone } = body
  if (!email || !password || !name) return error('Faltan campos requeridos', 400)
  if (getUserByEmail(email)) return error('El email ya está registrado', 409)
  const id = `user-${Date.now()}`
  const u: User = { id, email, password, name, phone: phone || null, role: 'cliente', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  registeredUsers.push(u)
  const token = signJwt({ userId: id, email, role: 'cliente' })
  return NextResponse.json({ ok: true, data: { user: { id, email, name, phone: phone || null, role: 'cliente' }, token } }, { status: 201 })
}

function handleGetMe(user: any) {
  if (!user) return error('No autorizado', 401)
  const full = getUserById(user.userId)
  return json({ ok: true, data: { id: user.userId, email: user.email, name: full?.name || '', phone: full?.phone || null, role: user.role, createdAt: full?.createdAt } })
}

function handleGetBrands() {
  const data = brands.filter(b => b.isActive).map(b => ({
    id: b.id, name: b.name, slug: b.slug, description: b.description, phone: b.phone, logoImage: b.logoImage,
    productCount: products.filter(p => p.brandId === b.id && p.isActive).length,
  }))
  return json({ ok: true, data })
}

function handleGetProducts(sp: URLSearchParams) {
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get('perPage') || '24')))
  const cur = sp.get('currency') || 'USD'
  const rm = getRateMap()
  let f = products.filter(p => p.isActive)
  if (sp.get('featured') === 'true') f = f.filter(p => p.isFeatured)
  if (sp.get('discount') === 'true') f = f.filter(p => p.hasDiscount)
  if (sp.get('inStock') === 'true') f = f.filter(p => p.stock > 0)
  const bf = sp.get('brand')
  if (bf) { const b = brands.find(br => br.slug === bf); if (b) f = f.filter(p => p.brandId === b.id) }
  const bfid = sp.get('brandId')
  if (bfid) f = f.filter(p => p.brandId === bfid)
  const cat = sp.get('category')
  if (cat) f = f.filter(p => p.category === cat)
  const q = sp.get('q')
  if (q) f = f.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
  const mp = sp.get('minPrice')
  if (mp) { const r = rm[cur] || 1; f = f.filter(p => (cur === 'USD' ? p.priceCop : p.priceCop / r) >= parseFloat(mp)) }
  const xp = sp.get('maxPrice')
  if (xp) { const r = rm[cur] || 1; f = f.filter(p => (cur === 'USD' ? p.priceCop : p.priceCop / r) <= parseFloat(xp)) }
  const ob = sp.get('orderBy') || 'relevance'
  const om: Record<string, (a: any, b: any) => number> = {
    relevance: (a, b) => b.soldCount - a.soldCount, price_asc: (a, b) => a.priceCop - b.priceCop,
    price_desc: (a, b) => b.priceCop - a.priceCop, newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    name_asc: (a, b) => a.name.localeCompare(b.name),
  }
  f.sort(om[ob] || om.relevance)
  const total = f.length
  const pg = f.slice((page - 1) * perPage, page * perPage)
  const rate = rm[cur] || 1
  const converted = pg.map(p => {
    const cp = cur === 'USD' ? p.priceCop : p.priceCop / rate
    const dp = p.hasDiscount && p.discountPercent > 0 ? cp * (1 - p.discountPercent / 100) : null
    return { ...p, price: Math.round(cp * 100) / 100, priceCop: p.priceCop, currency: cur, displayPrice: formatPrice(cp, cur), discountPrice: dp ? Math.round(dp * 100) / 100 : null, displayDiscountPrice: dp ? formatPrice(dp, cur) : null, brand: getBrandById(p.brandId) }
  })
  return json({ ok: true, data: converted, pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) } })
}

function handleGetCategories() {
  const cats: Record<string, number> = {}
  products.filter(p => p.isActive && p.category).forEach(p => { cats[p.category!] = (cats[p.category!] || 0) + 1 })
  return json({ ok: true, data: { categories: Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) } })
}

function handleGetProduct(id: string, sp: URLSearchParams) {
  const p = products.find(x => x.id === id && x.isActive)
  if (!p) return error('Producto no encontrado', 404)
  const cur = sp.get('currency') || 'USD'
  const rm = getRateMap()
  const rate = rm[cur] || 1
  const cp = cur === 'USD' ? p.priceCop : p.priceCop / rate
  const rated = comments.filter(c => c.productId === id && c.type === 'comment' && c.rating !== null)
  const avg = rated.length > 0 ? rated.reduce((s, c) => s + (c.rating || 0), 0) / rated.length : 0
  return json({ ok: true, data: { ...p, price: Math.round(cp * 100) / 100, priceCop: p.priceCop, currency: cur, displayPrice: formatPrice(cp, cur), commentsCount: comments.filter(c => c.productId === id).length, averageRating: Math.round(avg * 10) / 10, reviewsCount: rated.length, specifications: p.specifications || [], badges: p.badges || [], brand: getBrandById(p.brandId) } })
}

function handleGetComments(productId: string, sp: URLSearchParams) {
  const product = products.find(p => p.id === productId && p.isActive)
  if (!product) return error('Producto no encontrado', 404)
  const type = sp.get('type')
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const perPage = Math.min(50, Math.max(1, parseInt(sp.get('perPage') || '10')))
  let filtered = comments.filter(c => c.productId === productId && c.parentId === null)
  if (type === 'question' || type === 'comment') filtered = filtered.filter(c => c.type === type)
  const total = filtered.length
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const allC = comments.filter(c => c.productId === productId)
  const ratedC = allC.filter(c => c.type === 'comment' && c.rating !== null)
  const avg = ratedC.length > 0 ? ratedC.reduce((s, c) => s + (c.rating || 0), 0) / ratedC.length : 0
  const dist: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  ratedC.forEach(c => { if (c.rating) dist[String(c.rating)]++ })
  const formatted = paginated.map(c => {
    const u = getUserById(c.userId)
    const replies = comments.filter(r => r.parentId === c.id).map(r => {
      const ru = getUserById(r.userId)
      return { id: r.id, user: { name: ru?.name || 'Anónimo', initials: (ru?.name || 'A').charAt(0) }, content: r.content, createdAt: r.createdAt, reactions: r.reactions || {} }
    })
    return { id: c.id, type: c.type, user: { name: u?.name || 'Anónimo', initials: (u?.name || 'A').charAt(0) }, content: c.content, images: c.images, rating: c.rating, createdAt: c.createdAt, resolved: c.type === 'question' ? c.resolved : null, reactions: c.reactions || {}, replies }
  })
  return json({ ok: true, data: { averageRating: Math.round(avg * 10) / 10, totalComments: allC.filter(c => c.type === 'comment').length, totalQuestions: allC.filter(c => c.type === 'question').length, distribution: dist, comments: formatted, pagination: { page, perPage, total } } })
}

async function handleCreateComment(productId: string, body: any, auth: any) {
  const p = products.find(x => x.id === productId && x.isActive)
  if (!p) return error('Producto no encontrado', 404)
  const { type = 'comment', content, rating } = body
  if (!content) return error('Contenido requerido', 400)
  const id = `comment-${Date.now()}`
  const nc: Comment = { id, productId, userId: auth.userId, type, content, images: [], rating: rating || null, parentId: null, resolved: false, reactions: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  comments.push(nc)
  return NextResponse.json({ ok: true, data: nc }, { status: 201 })
}

async function handleReply(productId: string, commentId: string, body: any, auth: any) {
  const { content } = body
  if (!content) return error('Contenido requerido', 400)
  const parent = comments.find(c => c.id === commentId)
  if (!parent) return error('Comentario no encontrado', 404)
  const id = `reply-${Date.now()}`
  const reply: Comment = { id, productId, userId: auth.userId, type: 'reply', content, images: [], rating: null, parentId: commentId, resolved: false, reactions: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  comments.push(reply)
  return NextResponse.json({ ok: true, data: reply }, { status: 201 })
}

function handleReact(commentId: string) {
  const c = comments.find(x => x.id === commentId)
  if (!c) return error('Comentario no encontrado', 404)
  c.reactions.helpful = (c.reactions.helpful || 0) + 1
  return json({ ok: true, data: { reactions: c.reactions } })
}

function handleResolve(commentId: string) {
  const c = comments.find(x => x.id === commentId)
  if (!c) return error('Comentario no encontrado', 404)
  c.resolved = true
  return json({ ok: true, data: c })
}

async function handleReport(productId: string, body: any) {
  if (!body.reason) return error('Motivo requerido', 400)
  return NextResponse.json({ ok: true, data: { id: `report-${Date.now()}`, productId, reason: body.reason } }, { status: 201 })
}

async function handleNotifyStock(productId: string, auth: any) {
  const p = products.find(x => x.id === productId)
  if (!p) return error('Producto no encontrado', 404)
  if (p.stock > 0) return error('El producto tiene stock', 400)
  return NextResponse.json({ ok: true, data: { id: `stock-notif-${Date.now()}`, productId, userId: auth.userId } }, { status: 201 })
}

function handleRelated(productId: string, sp: URLSearchParams) {
  const p = products.find(x => x.id === productId && x.isActive)
  if (!p) return error('Producto no encontrado', 404)
  const cur = sp.get('currency') || 'USD'
  const rm = getRateMap()
  const rate = rm[cur] || 1
  const same = products.filter(x => x.isActive && x.category === p.category && x.id !== productId).slice(0, 6)
  const together = products.filter(x => x.isActive && x.id !== productId).slice(0, 4)
  const fmt = (x: any) => { const cp = cur === 'USD' ? x.priceCop : x.priceCop / rate; return { ...x, price: Math.round(cp * 100) / 100, priceCop: x.priceCop, currency: cur, displayPrice: formatPrice(cp, cur) } }
  return json({ ok: true, data: { sameCategory: same.map(fmt), boughtTogether: together.map(fmt) } })
}

function handleGetCart(userId: string) {
  const cart = carts.find(c => c.userId === userId)
  if (!cart) return json({ ok: true, data: { id: null, items: [], total: 0, totalItems: 0 } })
  const items = cart.items.map(ci => { const p = products.find(x => x.id === ci.productId); return { ...ci, product: p ? { ...p, brand: getBrandById(p.brandId) } : null } })
  return json({ ok: true, data: { id: cart.id, items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), totalItems: items.reduce((s, i) => s + i.quantity, 0) } })
}

async function handleAddToCart(body: any, auth: any) {
  const { productId, quantity } = body
  if (!productId) return error('productId requerido', 400)
  const p = products.find(x => x.id === productId && x.isActive)
  if (!p) return error('Producto no encontrado', 404)
  const qty = quantity || 1
  if (qty < 1) return error('Cantidad inválida', 400)
  if (p.stock < qty) return error('Stock insuficiente', 400)
  let cart = carts.find(c => c.userId === auth.userId)
  if (!cart) { cart = { id: `cart-${cartsCounter++}`, userId: auth.userId, items: [] }; carts.push(cart) }
  const existing = cart.items.find(ci => ci.productId === productId)
  if (existing) { existing.quantity += qty; return NextResponse.json({ ok: true, data: existing }, { status: 201 }) }
  const item: CartItem = { id: `ci-${cartItemCounter++}`, cartId: cart.id, productId, quantity: qty, price: p.priceCop }
  cart.items.push(item)
  return NextResponse.json({ ok: true, data: item }, { status: 201 })
}

function handleUpdateCartItem(itemId: string, body: any, auth: any) {
  const { quantity } = body
  if (quantity === undefined || quantity < 1) return error('Cantidad inválida', 400)
  const cart = carts.find(c => c.userId === auth.userId)
  if (!cart) return error('Carrito no encontrado', 404)
  const item = cart.items.find(ci => ci.id === itemId)
  if (!item) return error('Item no encontrado', 404)
  const p = products.find(x => x.id === item.productId)
  if (p && quantity > p.stock) return error('Stock insuficiente', 400)
  item.quantity = quantity
  return json({ ok: true, data: item })
}

function handleDeleteCartItem(itemId: string, auth: any) {
  const cart = carts.find(c => c.userId === auth.userId)
  if (!cart) return error('Carrito no encontrado', 404)
  cart.items = cart.items.filter(ci => ci.id !== itemId)
  return json({ ok: true, data: { id: itemId } })
}

function handleClearCart(auth: any) {
  const idx = carts.findIndex(c => c.userId === auth.userId)
  if (idx === -1) return json({ ok: true, data: null })
  carts.splice(idx, 1)
  return json({ ok: true, data: { message: 'Carrito limpiado' } })
}

async function handleCheckout(body: any, auth: any) {
  const { paymentMethod, deliveryAddress, notes, contactPhone, currency, deliveryFee, paymentProof } = body
  const cart = carts.find(c => c.userId === auth.userId)
  if (!cart || cart.items.length === 0) return error('El carrito está vacío', 400)
  const totalCop = cart.items.reduce((sum, item) => { const p = products.find(x => x.id === item.productId); return sum + ((p?.priceCop || 0) * item.quantity) }, 0)
  const fee = deliveryFee || 0
  const rm = getRateMap()
  const cur = currency || 'USD'
  const rate = rm[cur] || 1
  const gt = cur === 'USD' ? totalCop + fee : (totalCop + fee) / rate
  const id = `order-${orderCounter++}`
  const oItems: OrderItem[] = cart.items.map((item, i) => {
    const p = products.find(x => x.id === item.productId)
    const price = cur === 'USD' ? (p?.priceCop || 0) : (p?.priceCop || 0) / rate
    return { id: `oi-${id}-${i}`, orderId: id, productId: item.productId, name: p?.name || 'Producto', price: Math.round(price * 100) / 100, quantity: item.quantity, subtotal: Math.round(price * item.quantity * 100) / 100 }
  })
  const order: Order = {
    id, userId: auth.userId, status: paymentMethod === 'binance_pay' ? 'pending_payment' : 'confirmed',
    total: Math.round(gt * 100) / 100, totalCop: totalCop + fee, deliveryFee: fee, currency: cur, paymentMethod,
    paymentStatus: paymentMethod === 'binance_pay' ? 'pending' : (paymentProof ? 'pending_review' : 'pending'),
    paymentRef: null, paymentUrl: paymentMethod === 'binance_pay' ? `https://mock.binance.com/pay/${id}` : null,
    paymentProof: paymentProof || null, deliveryAddress: deliveryAddress || null,
    notes: notes || null, contactPhone: contactPhone || null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: oItems, delivery: null,
  }
  orders.push(order)
  const ci = carts.findIndex(c => c.userId === auth.userId)
  if (ci !== -1) carts.splice(ci, 1)
  notifCounter++
  notifications.push({ id: `notif-${notifCounter}`, userId: auth.userId, type: 'order_status', title: 'Pedido creado', message: `Tu pedido #${id.slice(-6)} ha sido creado`, read: false, data: { orderId: id, status: order.status }, orderId: id, createdAt: new Date().toISOString() })
  return NextResponse.json({ ok: true, data: order }, { status: 201 })
}

function handleGetOrders(userId: string) {
  return json({ ok: true, data: orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
}

function handleGetOrder(id: string, auth: any) {
  const o = orders.find(x => x.id === id)
  if (!o) return error('Pedido no encontrado', 404)
  if (o.userId !== auth.userId && auth.role !== 'admin') return error('No autorizado', 403)
  return json({ ok: true, data: o })
}

async function handlePayOrder(id: string, body: any, auth: any) {
  if (!body.paymentRef) return error('Referencia requerida', 400)
  const o = orders.find(x => x.id === id)
  if (!o) return error('Pedido no encontrado', 404)
  if (o.userId !== auth.userId) return error('No autorizado', 403)
  o.paymentRef = body.paymentRef
  o.paymentStatus = 'pending_review'
  o.paymentProof = body.paymentProof || null
  o.updatedAt = new Date().toISOString()
  return json({ ok: true, data: o })
}

function handleTracking(id: string, auth: any) {
  const o = orders.find(x => x.id === id)
  if (!o) return error('Pedido no encontrado', 404)
  if (o.userId !== auth.userId && auth.role !== 'admin') return error('No autorizado', 403)
  if (!o.delivery) return json({ ok: true, data: null })
  return json({ ok: true, data: { deliveryId: o.delivery.id, status: o.delivery.status, driver: o.delivery.driver, latestLocation: o.delivery.locations[0] || null, orderStatus: o.status } })
}

function handleGetMenu() { return json({ ok: true, data: menuItems.filter(m => m.isAvailable) }) }

function handlePrepTime() {
  const avail = menuItems.filter(m => m.isAvailable)
  const avg = avail.length > 0 ? Math.round(avail.reduce((s, m) => s + m.preparationTime, 0) / avail.length) : 0
  return json({ ok: true, data: { averagePreparationTime: avg } })
}

function handleMenuComments() { return json({ ok: true, data: { totalComments: 0, comments: [], pagination: { page: 1, perPage: 10, total: 0 } } }) }

function handleGetRates() {
  const rm: Record<string, number> = { COP: 1 }
  for (const r of exchangeRates) rm[r.currency] = r.rate
  if (!rm['Bs']) rm['Bs'] = 36.50
  if (!rm['USD']) rm['USD'] = 1
  return json({ ok: true, data: { base: 'COP', rates: rm, updatedAt: new Date().toISOString() } })
}

function handleGetNotifs(userId: string, sp: URLSearchParams) {
  const limit = parseInt(sp.get('limit') || '20')
  const un = notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
  return json({ ok: true, data: { notifications: un, unreadCount: notifications.filter(n => n.userId === userId && !n.read).length } })
}

function handleMarkRead(id: string) {
  const n = notifications.find(x => x.id === id)
  if (!n) return error('Notificación no encontrada', 404)
  n.read = true
  return json({ ok: true, data: n })
}

function handleMarkAllRead(userId: string) {
  notifications.filter(n => n.userId === userId && !n.read).forEach(n => { n.read = true })
  return json({ ok: true, data: { message: 'Todas marcadas como leídas' } })
}

async function handleAssistant(body: any) {
  const { message, conversationId } = body
  if (!message) return error('Mensaje requerido', 400)
  const msg = message.toLowerCase()
  let response = AI_RESPONSES.default
  if (msg.includes('delivery') || msg.includes('envio') || msg.includes('envío')) response = AI_RESPONSES.delivery
  else if (msg.includes('pago') || msg.includes('pagar') || msg.includes('binance') || msg.includes('transferencia')) response = AI_RESPONSES.pago
  else if (msg.includes('horario') || msg.includes('hora') || msg.includes('abierto')) response = AI_RESPONSES.horario
  else if (msg.includes('pedido') || msg.includes('pedir') || msg.includes('comprar')) response = AI_RESPONSES.pedido
  else if (msg.includes('track') || msg.includes('rastrear') || msg.includes('mapa')) response = AI_RESPONSES.tracking
  else if (msg.includes('producto') || msg.includes('catalogo') || msg.includes('oferta') || msg.includes('precio')) response = AI_RESPONSES.productos
  else if (msg.includes('ubicacion') || msg.includes('donde') || msg.includes('dirección')) response = AI_RESPONSES.ubicacion
  const convId = conversationId || `conv-${Date.now()}`
  return json({ ok: true, data: { conversationId: convId, message: { id: `msg-${Date.now()}`, role: 'assistant', content: response, createdAt: new Date().toISOString() }, reply: response, suggestedActions: ['Ver mis pedidos', 'Rastrear entrega', 'Buscar productos', 'Ayuda con pago'], timestamp: new Date().toISOString() } })
}

function handleAdminStats() {
  return json({ ok: true, data: { totalProducts: products.length, totalOrders: orders.length, totalUsers: [...seedUsers, ...registeredUsers].length, totalRevenue: orders.reduce((s, o) => s + o.total, 0), recentOrders: orders.slice(-5).reverse() } })
}

function handleAdminOrders() { return json({ ok: true, data: orders }) }

function handleAdminUsers() { return json({ ok: true, data: [...seedUsers, ...registeredUsers].map(u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, ordersCount: orders.filter((o: any) => o.userId === u.id).length, createdAt: u.createdAt })) }) }

function handleAdminProducts() { return json({ ok: true, data: products }) }

async function handleAdminOrderStatus(id: string, body: any) {
  const { status } = body
  const valid = ['pending_payment', 'confirmed', 'preparing', 'in_transit', 'delivered', 'cancelled']
  if (!status || !valid.includes(status)) return error('Estado inválido', 400)
  const o = orders.find(x => x.id === id)
  if (!o) return error('Pedido no encontrado', 404)
  o.status = status
  o.updatedAt = new Date().toISOString()
  const labels: Record<string, string> = { pending_payment: 'Pendiente de pago', confirmed: 'Confirmado', preparing: 'Preparando', in_transit: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado' }
  notifCounter++
  notifications.push({ id: `notif-${notifCounter}`, userId: o.userId, type: 'order_status', title: `Pedido ${labels[status] || status}`, message: `Tu pedido #${o.id.slice(-6)} ahora está: ${labels[status] || status}`, read: false, data: { orderId: o.id, status }, orderId: o.id, createdAt: new Date().toISOString() })
  return json({ ok: true, data: o })
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const sp = req.nextUrl.searchParams
  const auth = extractAuth(req)

  if (path === '/health') return json({ ok: true, name: 'amsterdam-to-vzla-demo', mode: 'mock' })
  if (path === '/auth/me') return auth ? handleGetMe(auth) : error('No autorizado', 401)
  if (path === '/brands') return handleGetBrands()
  if (path.startsWith('/brands/') && path.endsWith('/products')) { const s = path.split('/')[2]; const b = brands.find(x => x.slug === s); return b ? json({ ok: true, data: products.filter(p => p.brandId === b.id && p.isActive) }) : error('Marca no encontrada', 404) }
  if (path.match(/^\/brands\/[^/]+$/)) { const s = path.split('/')[2]; const b = brands.find(x => x.slug === s); return b ? json({ ok: true, data: { ...b, productCount: products.filter(p => p.brandId === b.id).length } }) : error('Marca no encontrada', 404) }
  if (path === '/products') return handleGetProducts(sp)
  if (path === '/products/categories') return handleGetCategories()
  if (path.match(/^\/products\/[^/]+\/related$/)) return handleRelated(path.split('/')[2], sp)
  if (path.match(/^\/products\/[^/]+\/comments$/)) return handleGetComments(path.split('/')[2], sp)
  if (path.match(/^\/products\/[^/]+$/)) return handleGetProduct(path.split('/')[2], sp)
  if (path === '/cart') return auth ? handleGetCart(auth.userId) : error('No autorizado', 401)
  if (path === '/checkout/orders') return auth ? handleGetOrders(auth.userId) : error('No autorizado', 401)
  if (path.match(/^\/checkout\/orders\/[^/]+$/)) return auth ? handleGetOrder(path.split('/').pop()!, auth) : error('No autorizado', 401)
  if (path.match(/^\/delivery\/orders\/[^/]+\/tracking$/)) return auth ? handleTracking(path.split('/')[3], auth) : error('No autorizado', 401)
  if (path === '/fastfood/menu') return handleGetMenu()
  if (path === '/fastfood/preparation-time') return handlePrepTime()
  if (path.match(/^\/fastfood\/menu\/[^/]+\/comments$/)) return handleMenuComments()
  if (path === '/rates') return handleGetRates()
  if (path === '/notifications') return auth ? handleGetNotifs(auth.userId, sp) : error('No autorizado', 401)
  if (path === '/admin/stats') return (auth && auth.role === 'admin') ? handleAdminStats() : error('No autorizado', 403)
  if (path === '/admin/orders') return (auth && auth.role === 'admin') ? handleAdminOrders() : error('No autorizado', 403)
  if (path === '/admin/users') return (auth && auth.role === 'admin') ? handleAdminUsers() : error('No autorizado', 403)
  if (path === '/admin/products') return (auth && auth.role === 'admin') ? handleAdminProducts() : error('No autorizado', 403)

  return error('Ruta no encontrada', 404)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const auth = extractAuth(req)
  let body: any = {}
  try { body = await req.json() } catch {}

  if (path === '/auth/login') return handleLogin(body)
  if (path === '/auth/register') return handleRegister(body)
  if (path === '/cart/items') return auth ? handleAddToCart(body, auth) : error('No autorizado', 401)
  if (path === '/checkout') return auth ? handleCheckout(body, auth) : error('No autorizado', 401)
  if (path.match(/^\/checkout\/orders\/[^/]+\/pay$/)) return auth ? handlePayOrder(path.split('/')[3], body, auth) : error('No autorizado', 401)
  if (path.match(/^\/products\/[^/]+\/comments$/)) return auth ? handleCreateComment(path.split('/')[2], body, auth) : error('No autorizado', 401)
  if (path.match(/^\/products\/[^/]+\/comments\/[^/]+\/reply$/)) return auth ? handleReply(path.split('/')[2], path.split('/')[4], body, auth) : error('No autorizado', 401)
  if (path.match(/^\/products\/[^/]+\/comments\/[^/]+\/react$/)) return auth ? handleReact(path.split('/')[4]) : error('No autorizado', 401)
  if (path.match(/^\/products\/[^/]+\/comments\/[^/]+\/resolve$/)) return (auth && auth.role === 'admin') ? handleResolve(path.split('/')[4]) : error('No autorizado', 403)
  if (path.match(/^\/products\/[^/]+\/report$/)) return auth ? handleReport(path.split('/')[2], body) : error('No autorizado', 401)
  if (path.match(/^\/products\/[^/]+\/notify-stock$/)) return auth ? handleNotifyStock(path.split('/')[2], auth) : error('No autorizado', 401)
  if (path === '/assistant/chat') return auth ? handleAssistant(body) : error('No autorizado', 401)
  if (path.match(/^\/delivery\/orders\/[^/]+\/status$/)) return (auth && auth.role === 'admin') ? handleAdminOrderStatus(path.split('/')[3], body) : error('No autorizado', 403)

  return error('Ruta no encontrada', 404)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const auth = extractAuth(req)
  let body: any = {}
  try { body = await req.json() } catch {}

  if (path === '/auth/me') return auth ? (async () => {
    const full = getUserById(auth.userId)
    if (!full) return error('Usuario no encontrado', 404)
    if (body.name) full.name = body.name
    if (body.phone !== undefined) full.phone = body.phone
    if (body.email) full.email = body.email
    return json({ ok: true, data: { id: full.id, email: full.email, name: full.name, phone: full.phone, role: full.role } })
  })() : error('No autorizado', 401)
  if (path.match(/^\/cart\/items\/[^/]+$/)) return auth ? handleUpdateCartItem(path.split('/').pop()!, body, auth) : error('No autorizado', 401)
  if (path.match(/^\/notifications\/[^/]+\/read$/)) return auth ? handleMarkRead(path.split('/')[2]) : error('No autorizado', 401)
  if (path === '/notifications/read-all') return auth ? handleMarkAllRead(auth.userId) : error('No autorizado', 401)

  return error('Ruta no encontrada', 404)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const auth = extractAuth(req)

  if (path === '/cart') return auth ? handleClearCart(auth) : error('No autorizado', 401)
  if (path.match(/^\/cart\/items\/[^/]+$/)) return auth ? handleDeleteCartItem(path.split('/').pop()!, auth) : error('No autorizado', 401)

  return error('Ruta no encontrada', 404)
}
