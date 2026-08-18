import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

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

export default router
