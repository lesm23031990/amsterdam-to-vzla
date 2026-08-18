import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

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

export default router
