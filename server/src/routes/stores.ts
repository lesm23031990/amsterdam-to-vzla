import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

router.post('/', authMiddleware, requireRole('tienda', 'admin'), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, phone, address, category, coverImage, logoImage } = req.body

    if (!name || !slug) {
      res.status(400).json({ ok: false, error: 'Nombre y slug son requeridos' })
      return
    }

    const existing = await db.store.findUnique({ where: { slug } })
    if (existing) {
      res.status(409).json({ ok: false, error: 'El slug ya está en uso' })
      return
    }

    const store = await db.store.create({
      data: {
        name,
        slug,
        description: description || null,
        phone: phone || null,
        address: address || null,
        category: category || null,
        coverImage: coverImage || null,
        logoImage: logoImage || null,
        ownerId: req.user!.userId,
      },
    })

    res.status(201).json({ ok: true, data: store })
  } catch (error) {
    console.error('Create store error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear tienda' })
  }
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const stores = await db.store.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        phone: true,
        address: true,
        category: true,
        coverImage: true,
        logoImage: true,
        ownerId: true,
        createdAt: true,
      },
    })
    res.json({ ok: true, data: stores })
  } catch (error) {
    console.error('List stores error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar tiendas' })
  }
})

router.get('/mine', authMiddleware, requireRole('tienda'), async (req: Request, res: Response) => {
  try {
    const stores = await db.store.findMany({
      where: { ownerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const data = stores.map((store) => ({
      ...store,
      activeSubscription: store.subscriptions[0] || null,
    }))

    res.json({ ok: true, data })
  } catch (error) {
    console.error('Get my stores error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tus tiendas' })
  }
})

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const store = await db.store.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        owner: { select: { id: true, name: true } },
      },
    })

    if (!store) {
      res.status(404).json({ ok: false, error: 'Tienda no encontrada' })
      return
    }

    res.json({ ok: true, data: store })
  } catch (error) {
    console.error('Get store error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tienda' })
  }
})

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const store = await db.store.findUnique({ where: { id: req.params.id as string } })

    if (!store) {
      res.status(404).json({ ok: false, error: 'Tienda no encontrada' })
      return
    }

    if (store.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para modificar esta tienda' })
      return
    }

    if (req.body.slug && req.body.slug !== store.slug) {
      const existing = await db.store.findUnique({ where: { slug: req.body.slug } })
      if (existing) {
        res.status(409).json({ ok: false, error: 'El slug ya está en uso' })
        return
      }
    }

    const updated = await db.store.update({
      where: { id: req.params.id as string },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.slug && { slug: req.body.slug }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.phone !== undefined && { phone: req.body.phone }),
        ...(req.body.address !== undefined && { address: req.body.address }),
        ...(req.body.category !== undefined && { category: req.body.category }),
        ...(req.body.coverImage !== undefined && { coverImage: req.body.coverImage }),
        ...(req.body.logoImage !== undefined && { logoImage: req.body.logoImage }),
      },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update store error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar tienda' })
  }
})

router.get('/plans/list', async (_req: Request, res: Response) => {
  try {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    })
    res.json({ ok: true, data: plans })
  } catch (error) {
    console.error('List plans error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar planes' })
  }
})

router.post('/:storeId/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { planId } = req.body

    if (!planId) {
      res.status(400).json({ ok: false, error: 'planId es requerido' })
      return
    }

    const store = await db.store.findUnique({ where: { id: req.params.storeId as string } })
    if (!store) {
      res.status(404).json({ ok: false, error: 'Tienda no encontrada' })
      return
    }

    if (store.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para suscribir esta tienda' })
      return
    }

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      res.status(404).json({ ok: false, error: 'Plan no encontrado' })
      return
    }

    const expiresAt = new Date()
    if (plan.interval === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else if (plan.interval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    const subscription = await db.storeSubscription.create({
      data: {
        storeId: store.id,
        planId: plan.id,
        status: 'active',
        startsAt: new Date(),
        expiresAt,
      },
    })

    res.status(201).json({ ok: true, data: subscription })
  } catch (error) {
    console.error('Subscribe error:', error)
    res.status(500).json({ ok: false, error: 'Error al suscribir tienda' })
  }
})

export default router
