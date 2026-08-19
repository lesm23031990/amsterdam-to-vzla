import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const page = Math.max(1, parseInt(String(req.query.page)) || 1)
    const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.perPage)) || 20))
    const unreadOnly = req.query.unread === 'true'

    const where: Record<string, unknown> = { userId }
    if (unreadOnly) where.read = false

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, status: true } },
        },
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, read: false } }),
    ])

    res.json({
      ok: true,
      data: {
        notifications,
        total,
        unreadCount,
        page,
        limit: perPage,
      },
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener notificaciones' })
  }
})

router.patch('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const notification = await db.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ ok: false, error: 'Notificación no encontrada' })
      return
    }

    await db.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    })

    res.json({ ok: true, data: { read: true } })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ ok: false, error: 'Error al marcar notificación' })
  }
})

router.patch('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    res.json({ ok: true, data: { read: true } })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ ok: false, error: 'Error al marcar todas como leídas' })
  }
})

export default router
