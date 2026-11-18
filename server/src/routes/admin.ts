import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { assignDriverToOrder } from '../services/deliveryAssignment'
import { expirePendingOrders } from '../services/orderExpiry'

const router = Router()

// GET /api/v1/admin/users — Lista todos los usuarios
router.get('/users', authMiddleware, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    })

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      ordersCount: u._count.orders,
      createdAt: u.createdAt,
    }))

    res.json({ ok: true, data })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar usuarios' })
  }
})

// GET /api/v1/admin/orders — Lista todas las órdenes
router.get('/orders', authMiddleware, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    // Expiración perezosa global: el panel admin no debe mostrar órdenes
    // impagas de más de 24h como si siguieran pendientes.
    await expirePendingOrders()

    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        delivery: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
            locations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    })

    res.json({ ok: true, data: orders })
  } catch (error) {
    console.error('Admin orders error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar órdenes' })
  }
})

// GET /api/v1/admin/drivers — Lista repartidores con su estado operativo
router.get('/drivers', authMiddleware, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const [drivers, activeDeliveries] = await Promise.all([
      db.driver.findMany({
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.delivery.findMany({
        where: { status: { in: ['assigned', 'pending', 'accepted', 'picked_up', 'in_transit'] } },
        select: { driverId: true, status: true },
      }),
    ])

    const deliveriesByDriver = new Map<string, number>()
    for (const delivery of activeDeliveries) {
      deliveriesByDriver.set(delivery.driverId, (deliveriesByDriver.get(delivery.driverId) || 0) + 1)
    }

    const data = drivers.map((driver) => {
      const activeCount = deliveriesByDriver.get(driver.userId) || 0
      const status = activeCount > 0 ? 'en_delivery' : driver.isOnline ? 'activo' : 'offline'

      return {
        id: driver.id,
        userId: driver.userId,
        name: driver.user.name,
        email: driver.user.email,
        phone: driver.user.phone,
        document: driver.document,
        isActive: driver.isActive,
        isOnline: driver.isOnline,
        status,
        activeDeliveries: activeCount,
        createdAt: driver.createdAt,
      }
    })

    res.json({ ok: true, data })
  } catch (error) {
    console.error('Admin drivers error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar repartidores' })
  }
})

// POST /api/v1/admin/drivers — Crea la cuenta de un repartidor
router.post('/drivers', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, email, phone, document, password } = req.body
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!name || !email) {
      res.status(400).json({ ok: false, error: 'name y email son requeridos' })
      return
    }

    if (!emailRegex.test(email)) {
      res.status(400).json({ ok: false, error: 'Formato de email inválido' })
      return
    }

    if (password && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))) {
      res.status(400).json({ ok: false, error: 'Password debe tener mínimo 8 caracteres, 1 mayúscula y 1 número' })
      return
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ ok: false, error: 'El email ya está registrado' })
      return
    }

    // Si el admin no define contraseña, se genera una temporal y se devuelve una sola vez.
    const temporaryPassword = password || `Repartidor${crypto.randomBytes(3).toString('hex').toUpperCase()}1`
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    const result = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone: phone || null,
          role: 'cliente',
        },
        select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      })

      const driver = await tx.driver.create({
        data: {
          userId: createdUser.id,
          document: document || null,
        },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      })

      return { user: createdUser, driver }
    })

    res.status(201).json({
      ok: true,
      data: {
        id: result.driver.id,
        userId: result.user.id,
        name: result.driver.user.name,
        email: result.driver.user.email,
        phone: result.driver.user.phone,
        document: result.driver.document,
        isActive: result.driver.isActive,
        status: 'offline',
        temporaryPassword: password ? undefined : temporaryPassword,
      },
    })
  } catch (error) {
    console.error('Admin create driver error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear repartidor' })
  }
})

// GET /api/v1/admin/deliveries — Lista deliveries activos
router.get('/deliveries', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const includeAll = req.query.all === '1'
    const deliveries = await db.delivery.findMany({
      where: includeAll
        ? {}
        : { status: { in: ['assigned', 'pending', 'accepted', 'picked_up', 'in_transit'] } },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: true,
          },
        },
        driver: { select: { id: true, name: true, phone: true } },
        locations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ ok: true, data: deliveries })
  } catch (error) {
    console.error('Admin deliveries error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar deliveries' })
  }
})

// POST /api/v1/admin/deliveries — Crea/asigna un delivery a un repartidor
router.post('/deliveries', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { orderId, driverId } = req.body

    if (!orderId || !driverId) {
      res.status(400).json({ ok: false, error: 'orderId y driverId son requeridos' })
      return
    }

    const result = await assignDriverToOrder(orderId, driverId)

    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error })
      return
    }

    res.status(201).json({ ok: true, data: result.delivery })
  } catch (error) {
    console.error('Admin assign delivery error:', error)
    res.status(500).json({ ok: false, error: 'Error al asignar delivery' })
  }
})

export default router
