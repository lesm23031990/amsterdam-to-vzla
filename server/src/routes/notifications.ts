import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/
const PUSH_PLATFORMS = ['android', 'ios'] as const
type PushPlatform = (typeof PUSH_PLATFORMS)[number]

function isPushPlatform(value: unknown): value is PushPlatform {
  return typeof value === 'string' && (PUSH_PLATFORMS as readonly string[]).includes(value)
}

// Registro idempotente del token de Expo Push del dispositivo autenticado.
router.post('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { token, platform } = req.body ?? {}

    if (typeof token !== 'string' || !EXPO_PUSH_TOKEN_PATTERN.test(token.trim())) {
      res.status(400).json({ ok: false, error: 'Token de push inválido' })
      return
    }

    if (!isPushPlatform(platform)) {
      res.status(400).json({ ok: false, error: 'Plataforma inválida. Usa android o ios' })
      return
    }

    const normalizedToken = token.trim()
    const pushToken = await db.pushToken.upsert({
      where: { token: normalizedToken },
      update: { userId, platform },
      create: { userId, token: normalizedToken, platform },
    })

    res.json({ ok: true, data: { id: pushToken.id, platform: pushToken.platform } })
  } catch (error) {
    console.error('Register push token error:', error)
    res.status(500).json({ ok: false, error: 'Error al registrar el token de push' })
  }
})

// Baja del token al cerrar sesión. Solo borra tokens del usuario autenticado.
router.delete('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    // Aceptamos el token en el body o en el query string: algunos clientes y
    // proxies no envían body en las peticiones DELETE.
    const token = (req.body ?? {}).token ?? req.query.token

    if (typeof token !== 'string' || token.trim().length === 0) {
      res.status(400).json({ ok: false, error: 'Token de push inválido' })
      return
    }

    const result = await db.pushToken.deleteMany({
      where: { token: token.trim(), userId },
    })

    res.json({ ok: true, data: { removed: result.count } })
  } catch (error) {
    console.error('Delete push token error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar el token de push' })
  }
})

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
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
    const userId = req.user!.userId
    const notification = await db.notification.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ ok: false, error: 'Notificación no encontrada' })
      return
    }

    await db.notification.update({
      where: { id: String(req.params.id) },
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
    const userId = req.user!.userId

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
