import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { createNotification } from '../services/notifications'

const router = Router()

const VALID_COMMENT_TYPES = ['question', 'comment', 'reply'] as const
const VALID_REACTIONS = ['helpful'] as const
const VALID_REPORT_REASONS = ['misleading_info', 'wrong_price', 'out_of_stock', 'inappropriate', 'other'] as const
const MAX_CONTENT_LENGTH = 500

router.post('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, priceCop, currency, category, images, stock, brandId, isFeatured, hasDiscount, discountPercent, specifications, badges } = req.body

    if (!name || priceCop === undefined) {
      res.status(400).json({ ok: false, error: 'Nombre y precio en COP son requeridos' })
      return
    }

    if (priceCop <= 0) {
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
        priceCop,
        currency: currency || 'COP',
        category: category || null,
        images: images || [],
        stock: stock ?? 0,
        isFeatured: isFeatured || false,
        hasDiscount: hasDiscount || false,
        discountPercent: discountPercent || 0,
        specifications: specifications || null,
        badges: badges || null,
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
    const { brandId, brand, category, q, minPrice, maxPrice, currency, orderBy, featured, discount, inStock, brandIds } = req.query
    const page = Math.max(1, parseInt(String(req.query.page)) || 1)
    const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.perPage)) || 24))
    const targetCurrency = (currency as string) || 'COP'

    const where: Record<string, unknown> = { isActive: true }

    if (featured === 'true') where.isFeatured = true
    if (discount === 'true') where.hasDiscount = true
    if (inStock === 'true') where.stock = { gt: 0 }
    if (brandId) where.brandId = brandId as string
    if (brand) where.brand = { slug: brand as string }
    if (category) where.category = category as string
    if (brandIds) {
      const ids = (brandIds as string).split(',').filter(Boolean)
      if (ids.length > 0) where.brandId = { in: ids }
    }
    if (q) where.name = { contains: q as string, mode: 'insensitive' }
    if (minPrice || maxPrice) {
      where.priceCop = {}
      if (minPrice) (where.priceCop as Record<string, unknown>).gte = parseFloat(minPrice as string)
      if (maxPrice) (where.priceCop as Record<string, unknown>).lte = parseFloat(maxPrice as string)
    }

    const rates = await db.exchangeRate.findMany()
    const rateMap: Record<string, number> = { COP: 1 }
    for (const r of rates) {
      rateMap[r.currency] = r.rate
    }
    if (!rateMap['Bs']) rateMap['Bs'] = 36.50
    if (!rateMap['USD']) rateMap['USD'] = 0.024

    const orderMap: Record<string, Record<string, 'asc' | 'desc'>> = {
      relevance: { createdAt: 'desc' },
      price_asc: { priceCop: 'asc' },
      price_desc: { priceCop: 'desc' },
      newest: { createdAt: 'desc' },
      name_asc: { name: 'asc' },
    }
    const orderByParam = (orderBy as string) || 'relevance'
    const orderByClause = orderMap[orderByParam] || orderMap.relevance

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: orderByClause,
        include: {
          brand: { select: { name: true, slug: true, logoImage: true } },
        },
      }),
      db.product.count({ where }),
    ])

    const convertedProducts = products.map((p) => {
      const priceCop = p.priceCop || 0
      const rate = rateMap[targetCurrency] || 1
      const convertedPrice = targetCurrency === 'COP' ? priceCop : priceCop / rate
      const discountPrice = p.hasDiscount && p.discountPercent > 0
        ? convertedPrice * (1 - p.discountPercent / 100)
        : null

      return {
        ...p,
        price: Math.round(convertedPrice * 100) / 100,
        priceCop,
        currency: targetCurrency,
        displayPrice: formatPrice(convertedPrice, targetCurrency as string),
        discountPrice: discountPrice ? Math.round(discountPrice * 100) / 100 : null,
        displayDiscountPrice: discountPrice ? formatPrice(discountPrice, targetCurrency as string) : null,
      }
    })

    res.json({
      ok: true,
      data: convertedProducts,
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

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await db.product.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: null } },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    })

    const result = categories
      .filter((c) => c.category)
      .map((c) => ({
        name: c.category,
        count: c._count.category,
      }))

    res.json({ ok: true, data: { categories: result } })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener categorías' })
  }
})

function formatPrice(price: number, currency: string): string {
  if (currency === 'Bs') {
    return `Bs. ${price.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (currency === 'USD') {
    return `USD $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `COP $${Math.round(price).toLocaleString('es-CO')}`
}

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

    const targetCurrency = (req.query.currency as string) || 'COP'

    const rates = await db.exchangeRate.findMany()
    const rateMap: Record<string, number> = { COP: 1 }
    for (const r of rates) {
      rateMap[r.currency] = r.rate
    }
    if (!rateMap['Bs']) rateMap['Bs'] = 36.50
    if (!rateMap['USD']) rateMap['USD'] = 0.024

    const priceCop = product.priceCop || 0
    const rate = rateMap[targetCurrency] || 1
    const convertedPrice = targetCurrency === 'COP' ? priceCop : priceCop / rate

    const [commentsCount, ratingAgg] = await Promise.all([
      db.productComment.count({ where: { productId: String(req.params.id) } }),
      db.productComment.aggregate({
        where: { productId: String(req.params.id), type: 'comment', rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

    const convertedProduct = {
      ...product,
      price: Math.round(convertedPrice * 100) / 100,
      priceCop,
      currency: targetCurrency,
      displayPrice: formatPrice(convertedPrice, targetCurrency),
      commentsCount,
      averageRating: ratingAgg._avg.rating || 0,
      reviewsCount: ratingAgg._count.rating || 0,
      specifications: product.specifications || [],
      badges: product.badges || [],
    }

    res.json({ ok: true, data: convertedProduct })
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

    if (req.body.priceCop !== undefined && req.body.priceCop <= 0) {
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
        ...(req.body.priceCop !== undefined && { priceCop: req.body.priceCop }),
        ...(req.body.currency && { currency: req.body.currency }),
        ...(req.body.category !== undefined && { category: req.body.category }),
        ...(req.body.images !== undefined && { images: req.body.images }),
        ...(req.body.stock !== undefined && { stock: req.body.stock }),
        ...(req.body.brandId !== undefined && { brandId: req.body.brandId || null }),
        ...(req.body.isFeatured !== undefined && { isFeatured: req.body.isFeatured }),
        ...(req.body.hasDiscount !== undefined && { hasDiscount: req.body.hasDiscount }),
        ...(req.body.discountPercent !== undefined && { discountPercent: req.body.discountPercent }),
        ...(req.body.specifications !== undefined && { specifications: req.body.specifications }),
        ...(req.body.badges !== undefined && { badges: req.body.badges }),
      },
    })

    if (product.stock === 0 && req.body.stock !== undefined && req.body.stock > 0) {
      const subs = await db.stockNotification.findMany({
        where: { productId: String(req.params.id), notified: false },
        include: { user: { select: { id: true, name: true } } },
      })
      for (const sub of subs) {
        await createNotification(
          sub.userId,
          'stock_available',
          'Producto disponible',
          `"${product.name}" ya tiene stock disponible`,
          { productId: product.id },
        )
        await db.stockNotification.update({
          where: { id: sub.id },
          data: { notified: true },
        })
      }
    }

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

router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const { type, page = '1', perPage = '10' } = req.query
    const pageNum = Math.max(1, parseInt(String(page)) || 1)
    const perPageNum = Math.min(50, Math.max(1, parseInt(String(perPage)) || 10))

    const where: Record<string, unknown> = {
      productId: String(req.params.id),
      parentId: null,
    }
    if (type && VALID_COMMENT_TYPES.includes(type as any)) {
      where.type = type
    }

    const [comments, total, ratingAgg] = await Promise.all([
      db.productComment.findMany({
        where,
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
        orderBy: [
          { resolved: 'asc' },
          { createdAt: 'desc' },
        ],
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
      db.productComment.count({ where }),
      db.productComment.aggregate({
        where: { productId: String(req.params.id), type: 'comment', rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

    const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    const ratedComments = await db.productComment.findMany({
      where: { productId: String(req.params.id), type: 'comment', rating: { not: null } },
      select: { rating: true },
    })
    for (const c of ratedComments) {
      if (c.rating) distribution[String(c.rating)] = (distribution[String(c.rating)] || 0) + 1
    }

    const totalComments = await db.productComment.count({
      where: { productId: String(req.params.id), type: 'comment' },
    })
    const totalQuestions = await db.productComment.count({
      where: { productId: String(req.params.id), type: 'question' },
    })

    const formattedComments = comments.map((c) => ({
      id: c.id,
      type: c.type,
      user: { name: c.user?.name || 'Anonimo', initials: (c.user?.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) },
      content: c.content,
      images: c.images || [],
      rating: c.rating,
      createdAt: c.createdAt,
      resolved: c.type === 'question' ? c.resolved : null,
      reactions: c.reactions || {},
      replies: (c.replies || []).map((r: any) => ({
        id: r.id,
        user: { name: r.user?.name || 'Anonimo', initials: (r.user?.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) },
        content: r.content,
        createdAt: r.createdAt,
        reactions: r.reactions || {},
      })),
    }))

    res.json({
      ok: true,
      data: {
        averageRating: ratingAgg._avg.rating || 0,
        totalComments,
        totalQuestions,
        distribution,
        comments: formattedComments,
        pagination: { page: pageNum, perPage: perPageNum, total },
      },
    })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener comentarios' })
  }
})

router.post('/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const { type = 'comment', content, rating, images } = req.body

    if (!content || content.trim().length === 0) {
      res.status(400).json({ ok: false, error: 'El contenido es requerido' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ ok: false, error: `Maximo ${MAX_CONTENT_LENGTH} caracteres` })
      return
    }

    if (!VALID_COMMENT_TYPES.includes(type as any)) {
      res.status(400).json({ ok: false, error: 'Tipo de comentario invalido' })
      return
    }

    if (rating !== undefined && rating !== null) {
      if (type !== 'comment') {
        res.status(400).json({ ok: false, error: 'Rating solo aplica a comentarios' })
        return
      }
      const r = Number(rating)
      if (r < 1 || r > 5 || !Number.isInteger(r)) {
        res.status(400).json({ ok: false, error: 'Rating debe ser entre 1 y 5' })
        return
      }
    }

    const comment = await db.productComment.create({
      data: {
        productId: String(req.params.id),
        userId: req.user!.userId,
        type,
        content: content.trim(),
        images: images || [],
        rating: rating ? Number(rating) : null,
        reactions: {},
      },
    })

    res.status(201).json({ ok: true, data: comment })
  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear comentario' })
  }
})

router.post('/:id/comments/:commentId/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const parent = await db.productComment.findUnique({
      where: { id: String(req.params.commentId) },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!parent || parent.productId !== req.params.id) {
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

    const reply = await db.productComment.create({
      data: {
        productId: String(req.params.id),
        userId: req.user!.userId,
        type: 'reply',
        content: content.trim(),
        parentId: String(req.params.commentId),
        reactions: {},
      },
    })

    if (parent.userId !== req.user!.userId) {
      await createNotification(
        parent.userId,
        'comment_reply',
        'Nueva respuesta a tu comentario',
        `${req.user!.email} respondio a tu comentario en "${product.name}"`,
        { commentId: parent.id, productId: product.id },
      )
    }

    res.status(201).json({ ok: true, data: reply })
  } catch (error) {
    console.error('Create reply error:', error)
    res.status(500).json({ ok: false, error: 'Error al responder comentario' })
  }
})

router.post('/:id/comments/:commentId/react', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const comment = await db.productComment.findUnique({
      where: { id: String(req.params.commentId) },
    })

    if (!comment || comment.productId !== req.params.id) {
      res.status(404).json({ ok: false, error: 'Comentario no encontrado' })
      return
    }

    const { reaction } = req.body

    if (!VALID_REACTIONS.includes(reaction as any)) {
      res.status(400).json({ ok: false, error: 'Reaccion invalida' })
      return
    }

    const reactions = (comment.reactions as Record<string, number>) || {}
    reactions[reaction] = (reactions[reaction] || 0) + 1

    const updated = await db.productComment.update({
      where: { id: String(req.params.commentId) },
      data: { reactions },
    })

    res.json({ ok: true, data: { reactions: updated.reactions } })
  } catch (error) {
    console.error('React error:', error)
    res.status(500).json({ ok: false, error: 'Error al reaccionar' })
  }
})

router.post('/:id/comments/:commentId/resolve', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const comment = await db.productComment.findUnique({
      where: { id: String(req.params.commentId) },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!comment || comment.productId !== req.params.id) {
      res.status(404).json({ ok: false, error: 'Comentario no encontrado' })
      return
    }

    const updated = await db.productComment.update({
      where: { id: String(req.params.commentId) },
      data: { resolved: true },
    })

    await createNotification(
      comment.userId,
      'question_resolved',
      'Tu pregunta fue respondida',
      `Tu pregunta en "${product.name}" fue marcada como resuelta`,
      { commentId: comment.id, productId: product.id },
    )

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Resolve comment error:', error)
    res.status(500).json({ ok: false, error: 'Error al marcar como resuelta' })
  }
})

router.post('/:id/report', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const existing = await db.productReport.findUnique({
      where: { productId_userId: { productId: String(req.params.id), userId: req.user!.userId } },
    })

    if (existing) {
      res.status(409).json({ ok: false, error: 'Ya reportaste este producto' })
      return
    }

    const { reason, details } = req.body

    if (!VALID_REPORT_REASONS.includes(reason as any)) {
      res.status(400).json({ ok: false, error: 'Motivo de reporte invalido' })
      return
    }

    const report = await db.productReport.create({
      data: {
        productId: String(req.params.id),
        userId: req.user!.userId,
        reason,
        details: details || null,
      },
    })

    const admins = await db.user.findMany({ where: { role: 'admin' } })
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'product_report',
        'Producto reportado',
        `${req.user!.email} reporto "${product.name}" por: ${reason}`,
        { reportId: report.id, productId: product.id },
      )
    }

    res.status(201).json({ ok: true, data: report })
  } catch (error) {
    console.error('Report product error:', error)
    res.status(500).json({ ok: false, error: 'Error al reportar producto' })
  }
})

router.post('/:id/notify-stock', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    if (product.stock > 0) {
      res.status(400).json({ ok: false, error: 'El producto tiene stock disponible' })
      return
    }

    const existing = await db.stockNotification.findUnique({
      where: { productId_userId: { productId: String(req.params.id), userId: req.user!.userId } },
    })

    if (existing) {
      res.status(409).json({ ok: false, error: 'Ya estas suscrito a notificaciones de este producto' })
      return
    }

    const sub = await db.stockNotification.create({
      data: {
        productId: String(req.params.id),
        userId: req.user!.userId,
      },
    })

    res.status(201).json({ ok: true, data: sub })
  } catch (error) {
    console.error('Stock notification error:', error)
    res.status(500).json({ ok: false, error: 'Error al suscribirse' })
  }
})

router.get('/:id/related', async (req: Request, res: Response) => {
  try {
    const product = await db.product.findUnique({
      where: { id: String(req.params.id) },
    })

    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    const targetCurrency = (req.query.currency as string) || 'COP'

    const rates = await db.exchangeRate.findMany()
    const rateMap: Record<string, number> = { COP: 1 }
    for (const r of rates) {
      rateMap[r.currency] = r.rate
    }
    if (!rateMap['Bs']) rateMap['Bs'] = 36.50
    if (!rateMap['USD']) rateMap['USD'] = 0.024

    const rate = rateMap[targetCurrency] || 1

    const sameCategory = await db.product.findMany({
      where: {
        isActive: true,
        category: product.category,
        id: { not: String(req.params.id) },
      },
      take: 6,
      orderBy: { soldCount: 'desc' },
      select: { id: true, name: true, priceCop: true, images: true, category: true, soldCount: true },
    })

    const ordersWithProduct = await db.orderItem.findMany({
      where: { productId: String(req.params.id) },
      select: { orderId: true },
      take: 50,
    })

    const orderIds = ordersWithProduct.map((o) => o.orderId)
    let boughtTogether: any[] = []

    if (orderIds.length > 0) {
      const relatedItems = await db.orderItem.findMany({
        where: {
          orderId: { in: orderIds },
          productId: { not: String(req.params.id) },
        },
        select: { productId: true },
      })

      const freq: Record<string, number> = {}
      for (const item of relatedItems) {
        freq[item.productId] = (freq[item.productId] || 0) + 1
      }

      const topIds = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id)

      if (topIds.length > 0) {
        boughtTogether = await db.product.findMany({
          where: {
            isActive: true,
            id: { in: topIds },
          },
          take: 4,
          select: { id: true, name: true, priceCop: true, images: true, category: true, soldCount: true },
        })
      }
    }

    const formatProduct = (p: any) => {
      const priceCop = p.priceCop || 0
      const convertedPrice = targetCurrency === 'COP' ? priceCop : priceCop / rate
      return {
        ...p,
        price: Math.round(convertedPrice * 100) / 100,
        priceCop,
        currency: targetCurrency,
        displayPrice: formatPrice(convertedPrice, targetCurrency),
      }
    }

    res.json({
      ok: true,
      data: {
        sameCategory: sameCategory.map(formatProduct),
        boughtTogether: boughtTogether.map(formatProduct),
      },
    })
  } catch (error) {
    console.error('Related products error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener productos relacionados' })
  }
})

export default router
