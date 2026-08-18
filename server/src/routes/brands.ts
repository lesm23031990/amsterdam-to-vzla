import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// POST /api/v1/brands — Crear marca (solo admin)
router.post('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, phone, logoImage } = req.body

    if (!name) {
      res.status(400).json({ ok: false, error: 'Nombre es requerido' })
      return
    }

    const slug = slugify(name)

    const existing = await db.brand.findUnique({ where: { slug } })
    if (existing) {
      res.status(409).json({ ok: false, error: 'Ya existe una marca con ese nombre' })
      return
    }

    const brand = await db.brand.create({
      data: {
        name,
        slug,
        description: description || null,
        phone: phone || null,
        logoImage: logoImage || null,
      },
    })

    res.status(201).json({ ok: true, data: brand })
  } catch (error) {
    console.error('Create brand error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear marca' })
  }
})

// GET /api/v1/brands — Listar marcas (público)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        phone: true,
        logoImage: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    })

    const data = brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      phone: b.phone,
      logoImage: b.logoImage,
      productCount: b._count.products,
    }))

    res.json({ ok: true, data })
  } catch (error) {
    console.error('List brands error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar marcas' })
  }
})

// GET /api/v1/brands/:slug — Ver detalle de marca (público)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const brand = await db.brand.findUnique({
      where: { slug: String(req.params.slug) },
      include: {
        _count: { select: { products: true } },
      },
    })

    if (!brand) {
      res.status(404).json({ ok: false, error: 'Marca no encontrada' })
      return
    }

    res.json({
      ok: true,
      data: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        phone: brand.phone,
        logoImage: brand.logoImage,
        productCount: brand._count.products,
      },
    })
  } catch (error) {
    console.error('Get brand error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener marca' })
  }
})

// GET /api/v1/brands/:slug/products — Productos de una marca (público)
router.get('/:slug/products', async (req: Request, res: Response) => {
  try {
    const brand = await db.brand.findUnique({ where: { slug: String(req.params.slug) } })
    if (!brand) {
      res.status(404).json({ ok: false, error: 'Marca no encontrada' })
      return
    }

    const products = await db.product.findMany({
      where: { brandId: brand.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        category: true,
        images: true,
        stock: true,
        createdAt: true,
      },
    })

    res.json({ ok: true, data: products })
  } catch (error) {
    console.error('List brand products error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar productos de la marca' })
  }
})

// PATCH /api/v1/brands/:id — Actualizar marca (solo admin)
router.patch('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const brand = await db.brand.findUnique({ where: { id: req.params.id as string } })

    if (!brand) {
      res.status(404).json({ ok: false, error: 'Marca no encontrada' })
      return
    }

    const updated = await db.brand.update({
      where: { id: String(req.params.id) },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.phone !== undefined && { phone: req.body.phone }),
        ...(req.body.logoImage !== undefined && { logoImage: req.body.logoImage }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update brand error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar marca' })
  }
})

// DELETE /api/v1/brands/:id — Eliminar marca (solo admin)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const brand = await db.brand.findUnique({ where: { id: req.params.id as string } })

    if (!brand) {
      res.status(404).json({ ok: false, error: 'Marca no encontrada' })
      return
    }

    await db.brand.delete({ where: { id: String(req.params.id) } })

    res.json({ ok: true, data: { message: 'Marca eliminada' } })
  } catch (error) {
    console.error('Delete brand error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar marca' })
  }
})

export default router
