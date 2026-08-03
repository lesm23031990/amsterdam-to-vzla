import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

router.get('/stores/:storeId/menu', async (req: Request, res: Response) => {
  try {
    const items = await db.menuItem.findMany({
      where: { storeId: req.params.storeId as string, isAvailable: true },
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

router.post('/stores/:storeId/menu', authMiddleware, requireRole('tienda'), async (req: Request, res: Response) => {
  try {
    const store = await db.store.findUnique({ where: { id: req.params.storeId as string } })
    if (!store) {
      res.status(404).json({ ok: false, error: 'Tienda no encontrada' })
      return
    }
    if (store.ownerId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para esta tienda' })
      return
    }
    if (store.category !== 'comida') {
      res.status(400).json({ ok: false, error: 'La tienda no es de categoría comida' })
      return
    }

    const { name, description, basePrice, currency, category, image, preparationTime } = req.body
    if (!name || basePrice === undefined) {
      res.status(400).json({ ok: false, error: 'Nombre y precio son requeridos' })
      return
    }

    const item = await db.menuItem.create({
      data: {
        storeId: store.id,
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

router.patch('/menu/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    const store = await db.store.findUnique({ where: { id: item.storeId } })
    if (!store || (store.ownerId !== req.user!.userId && req.user!.role !== 'admin')) {
      res.status(403).json({ ok: false, error: 'No autorizado para modificar este elemento' })
      return
    }

    const updated = await db.menuItem.update({
      where: { id: req.params.id as string },
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

router.delete('/menu/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    const store = await db.store.findUnique({ where: { id: item.storeId } })
    if (!store || (store.ownerId !== req.user!.userId && req.user!.role !== 'admin')) {
      res.status(403).json({ ok: false, error: 'No autorizado para eliminar este elemento' })
      return
    }

    await db.menuItem.delete({ where: { id: req.params.id as string } })
    res.json({ ok: true, data: null })
  } catch (error) {
    console.error('Delete menu item error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar elemento del menú' })
  }
})

router.post('/menu/:id/options', authMiddleware, async (req: Request, res: Response) => {
  try {
    const item = await db.menuItem.findUnique({ where: { id: req.params.id as string } })
    if (!item) {
      res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado' })
      return
    }

    const store = await db.store.findUnique({ where: { id: item.storeId } })
    if (!store || (store.ownerId !== req.user!.userId && req.user!.role !== 'admin')) {
      res.status(403).json({ ok: false, error: 'No autorizado para modificar este elemento' })
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

router.get('/stores/:storeId/preparation-time', async (req: Request, res: Response) => {
  try {
    const result = await db.menuItem.aggregate({
      where: { storeId: req.params.storeId as string, isAvailable: true },
      _avg: { preparationTime: true },
    })
    res.json({ ok: true, data: { averagePreparationTime: Math.round(result._avg?.preparationTime || 0) } })
  } catch (error) {
    console.error('Get preparation time error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tiempo de preparación' })
  }
})

export default router
