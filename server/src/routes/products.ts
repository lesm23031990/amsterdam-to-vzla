import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

router.post('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, price, currency, category, images, stock, brandId } = req.body

    if (!name || price === undefined) {
      res.status(400).json({ ok: false, error: 'Nombre y precio son requeridos' })
      return
    }

    if (price <= 0) {
      res.status(400).json({ ok: false, error: 'El precio debe ser mayor a 0' })
      return
    }

    if (stock !== undefined && stock < 0) {
      res.status(400).json({ ok: false, error: 'El stock no puede ser negativo' })
      return
    }

    if (brandId) {
      const brand = await db.brand.findUnique({ where: { id: brandId } })
      if (!brand) {
        res.status(404).json({ ok: false, error: 'Marca no encontrada' })
        return
      }
    }

    const product = await db.product.create({
      data: {
        brandId: brandId || null,
        name,
        description: description || null,
        price,
        currency: currency || 'USD',
        category: category || null,
        images: images || [],
        stock: stock ?? 0,
      },
    })

    res.status(201).json({ ok: true, data: product })
  } catch (error) {
    console.error('Create product error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear producto' })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const { brandId, brand, category, q, minPrice, maxPrice } = req.query
    const page = Math.max(1, parseInt(String(req.query.page)) || 1)
    const perPage = Math.min(50, Math.max(1, parseInt(String(req.query.perPage)) || 20))

    const where: Record<string, unknown> = { isActive: true }

    if (brandId) where.brandId = brandId as string
    if (brand) where.brand = { slug: brand as string }
    if (category) where.category = category as string
    if (q) where.name = { contains: q as string, mode: 'insensitive' }
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice as string)
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice as string)
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: { select: { name: true, slug: true, logoImage: true } },
        },
      }),
      db.product.count({ where }),
    ])

    res.json({
      ok: true,
      data: products,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('List products error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar productos' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoImage: true } },
      },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    res.json({ ok: true, data: product })
  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener producto' })
  }
})

router.patch('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({ where: { id: req.params.id as string } })

    if (!product) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    if (req.body.price !== undefined && req.body.price <= 0) {
      res.status(400).json({ ok: false, error: 'El precio debe ser mayor a 0' })
      return
    }

    if (req.body.stock !== undefined && req.body.stock < 0) {
      res.status(400).json({ ok: false, error: 'El stock no puede ser negativo' })
      return
    }

    const updated = await db.product.update({
      where: { id: String(req.params.id) },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.price !== undefined && { price: req.body.price }),
        ...(req.body.currency && { currency: req.body.currency }),
        ...(req.body.category !== undefined && { category: req.body.category }),
        ...(req.body.images !== undefined && { images: req.body.images }),
        ...(req.body.stock !== undefined && { stock: req.body.stock }),
        ...(req.body.brandId !== undefined && { brandId: req.body.brandId || null }),
      },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update product error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar producto' })
  }
})

router.delete('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({ where: { id: req.params.id as string } })

    if (!product) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    await db.product.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    })

    res.json({ ok: true, data: { id: String(req.params.id) } })
  } catch (error) {
    console.error('Delete product error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar producto' })
  }
})

export default router
