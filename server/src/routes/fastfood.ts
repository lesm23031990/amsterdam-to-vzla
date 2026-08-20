import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { createNotification } from '../services/notifications'

const router = Router()

const MAX_CONTENT_LENGTH = 500

// GET /api/v1/fastfood/menu — Listar menú (público)
router.get('/menu', async (_req: Request, res: Response) => {
  try {
    const items = await db.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          include: { choices: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    res.json({ ok: true, data: items })
  } catch (error) {
    console.error('List menu error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener menú' })
  }
})

// POST /api/v1/fastfood/menu — Crear item de menú (solo admin)
router.post('/menu', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, basePrice, currency, category, image, preparationTime } = req.body
    if (!name || basePrice === undefined) {
      res.status(400).json({ ok: false, error: 'Nombre y precio son requeridos' })
      return
    }

    const item = await db.menuItem.create({
      data: {
        name,
        description: description || null,
        basePrice,
        currency: currency || 'USD',
        category: category || null,
        image: image || null,
        preparationTime: preparationTime || 0,
      },
    })
    res.status(201).json({ ok: true, data: item })
  } catch (error) {
    console.error('Create menu item error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear elemento del menú' })
  }
})

// PATCH /api/v1/fastfood/menu/:id — Actualizar item (solo admin)
router.patch('/menu/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    const updated = await db.menuItem.update({
      where: { id: String(req.params.id) },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.basePrice !== undefined && { basePrice: req.body.basePrice }),
        ...(req.body.currency && { currency: req.body.currency }),
        ...(req.body.category !== undefined && { category: req.body.category }),
        ...(req.body.image !== undefined && { image: req.body.image }),
        ...(req.body.preparationTime !== undefined && { preparationTime: req.body.preparationTime }),
        ...(req.body.isAvailable !== undefined && { isAvailable: req.body.isAvailable }),
      },
    })
    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update menu item error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar elemento del menú' })
  }
})

// DELETE /api/v1/fastfood/menu/:id — Eliminar item (solo admin)
router.delete('/menu/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    await db.menuItem.delete({ where: { id: req.params.id as string } })
    res.json({ ok: true, data: null })
  } catch (error) {
    console.error('Delete menu item error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar elemento del menú' })
  }
})

// POST /api/v1/fastfood/menu/:id/options — Agregar opciones (solo admin)
router.post('/menu/:id/options', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    const { name, type, required, choices } = req.body
    if (!name || !type) {
      res.status(400).json({ ok: false, error: 'Nombre y tipo son requeridos' })
      return
    }
    if (type !== 'single' && type !== 'multiple') {
      res.status(400).json({ ok: false, error: 'Tipo debe ser single o multiple' })
      return
    }

    const option = await db.menuOption.create({
      data: {
        menuItemId: item.id,
        name,
        type,
        required: required || false,
        choices: choices
          ? {
              create: choices.map((c: { name: string; priceModifier?: number }) => ({
                name: c.name,
                priceModifier: c.priceModifier || 0,
              })),
            }
          : undefined,
      },
      include: { choices: true },
    })
    res.status(201).json({ ok: true, data: option })
  } catch (error) {
    console.error('Create menu option error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear opción del menú' })
  }
})

// GET /api/v1/fastfood/preparation-time — Tiempo promedio de preparación
router.get('/preparation-time', async (_req: Request, res: Response) => {
  try {
    const result = await db.menuItem.aggregate({
      where: { isAvailable: true },
      _avg: { preparationTime: true },
    })
    res.json({ ok: true, data: { averagePreparationTime: Math.round(result._avg?.preparationTime ?? 0) } })
  } catch (error) {
    console.error('Get preparation time error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tiempo de preparación' })
  }
})

// GET /api/v1/fastfood/menu/:id/comments
router.get('/menu/:id/comments', async (req: Request, res: Response) => {
  try {
    const menuItem = await db.menuItem.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!menuItem || !menuItem.isAvailable) {
      res.status(404).json({ ok: false, error: 'Elemento del menu no encontrado' })
      return
    }

    const { page = '1', perPage = '10' } = req.query
    const pageNum = Math.max(1, parseInt(String(page)) || 1)
    const perPageNum = Math.min(50, Math.max(1, parseInt(String(perPage)) || 10))

    const where = { menuItemId: String(req.params.id), parentId: null }

    const [comments, total] = await Promise.all([
      db.menuItemComment.findMany({
        where,
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      db.menuItemComment.count({ where }),
    ])

    const formattedComments = comments.map((c) => ({
      id: c.id,
      user: { name: c.user?.name || 'Anonimo', initials: (c.user?.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) },
      content: c.content,
      images: c.images || [],
      createdAt: c.createdAt,
      replies: (c.replies || []).map((r: any) => ({
        id: r.id,
        user: { name: r.user?.name || 'Anonimo', initials: (r.user?.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) },
        content: r.content,
        createdAt: r.createdAt,
      })),
    }))

    res.json({
      ok: true,
      data: {
        totalComments: total,
        comments: formattedComments,
        pagination: { page: pageNum, perPage: perPageNum, total },
      },
    })
  } catch (error) {
    console.error('Get menu item comments error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener comentarios' })
  }
})

// POST /api/v1/fastfood/menu/:id/comments
router.post('/menu/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const menuItem = await db.menuItem.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!menuItem || !menuItem.isAvailable) {
      res.status(404).json({ ok: false, error: 'Elemento del menu no encontrado' })
      return
    }

    const { content } = req.body

    if (!content || content.trim().length === 0) {
      res.status(400).json({ ok: false, error: 'El contenido es requerido' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ ok: false, error: `Maximo ${MAX_CONTENT_LENGTH} caracteres` })
      return
    }

    const comment = await db.menuItemComment.create({
      data: {
        menuItemId: String(req.params.id),
        userId: req.user!.userId,
        content: content.trim(),
      },
    })

    res.status(201).json({ ok: true, data: comment })
  } catch (error) {
    console.error('Create menu item comment error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear comentario' })
  }
})

// POST /api/v1/fastfood/menu/:id/comments/:commentId/reply
router.post('/menu/:id/comments/:commentId/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const menuItem = await db.menuItem.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!menuItem || !menuItem.isAvailable) {
      res.status(404).json({ ok: false, error: 'Elemento del menu no encontrado' })
      return
    }

    const parent = await db.menuItemComment.findUnique({
      where: { id: String(req.params.commentId) },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!parent || parent.menuItemId !== req.params.id) {
      res.status(404).json({ ok: false, error: 'Comentario no encontrado' })
      return
    }

    const { content } = req.body

    if (!content || content.trim().length === 0) {
      res.status(400).json({ ok: false, error: 'El contenido es requerido' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ ok: false, error: `Maximo ${MAX_CONTENT_LENGTH} caracteres` })
      return
    }

    const reply = await db.menuItemComment.create({
      data: {
        menuItemId: String(req.params.id),
        userId: req.user!.userId,
        content: content.trim(),
        parentId: String(req.params.commentId),
      },
    })

    if (parent.userId !== req.user!.userId) {
      await createNotification(
        parent.userId,
        'comment_reply',
        'Nueva respuesta a tu comentario',
        `${req.user!.email} respondio a tu comentario en "${menuItem.name}"`,
        { commentId: parent.id, menuItemId: menuItem.id },
      )
    }

    res.status(201).json({ ok: true, data: reply })
  } catch (error) {
    console.error('Create menu item reply error:', error)
    res.status(500).json({ ok: false, error: 'Error al responder comentario' })
  }
})

export default router
