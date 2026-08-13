import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'

const router = Router()

async function getOrCreateCart(userId: string) {
  return db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

router.post('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body
    const qty = quantity || 1

    if (!productId) {
      res.status(400).json({ ok: false, error: 'productId es requerido' })
      return
    }

    if (qty < 1) {
      res.status(400).json({ ok: false, error: 'La cantidad debe ser mayor a 0' })
      return
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product || !product.isActive) {
      res.status(404).json({ ok: false, error: 'Producto no encontrado' })
      return
    }

    if (product.stock < qty) {
      res.status(400).json({ ok: false, error: 'Stock insuficiente' })
      return
    }

    const cart = await getOrCreateCart(req.user!.userId)

    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    })

    let cartItem
    if (existing) {
      const newQty = existing.quantity + qty
      if (newQty > product.stock) {
        res.status(400).json({ ok: false, error: 'Stock insuficiente' })
        return
      }
      cartItem = await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      })
    } else {
      cartItem = await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: qty,
          price: product.price,
        },
      })
    }

    res.status(201).json({ ok: true, data: cartItem })
  } catch (error) {
    console.error('Add to cart error:', error)
    res.status(500).json({ ok: false, error: 'Error al agregar al carrito' })
  }
})

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cart = await db.cart.findUnique({
      where: { userId: req.user!.userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    })

    if (!cart) {
      res.json({ ok: true, data: { id: null, items: [], stores: [], total: 0 } })
      return
    }

    const grouped: Record<string, { store: { id: string; name: string; slug: string }; items: typeof cart.items; subtotal: number }> = {}

    for (const item of cart.items) {
      const storeId = item.product.store.id
      if (!grouped[storeId]) {
        grouped[storeId] = {
          store: item.product.store,
          items: [],
          subtotal: 0,
        }
      }
      grouped[storeId].items.push(item)
      grouped[storeId].subtotal += item.price * item.quantity
    }

    const stores = Object.values(grouped)
    const total = stores.reduce((sum, s) => sum + s.subtotal, 0)

    res.json({
      ok: true,
      data: {
        id: cart.id,
        items: cart.items,
        stores,
        total,
      },
    })
  } catch (error) {
    console.error('Get cart error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener carrito' })
  }
})

router.patch('/items/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body

    if (quantity === undefined || quantity < 1) {
      res.status(400).json({ ok: false, error: 'La cantidad debe ser mayor a 0' })
      return
    }

    const cartItem = await db.cartItem.findUnique({
      where: { id: String(req.params.id) },
      include: { cart: true, product: true },
    }) as any

    if (!cartItem) {
      res.status(404).json({ ok: false, error: 'Item no encontrado' })
      return
    }

    if (cartItem.cart.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para modificar este item' })
      return
    }

    if (quantity > cartItem.product.stock) {
      res.status(400).json({ ok: false, error: 'Stock insuficiente' })
      return
    }

    const updated = await db.cartItem.update({
      where: { id: String(req.params.id) },
      data: { quantity },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update cart item error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar item del carrito' })
  }
})

router.delete('/items/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cartItem = await db.cartItem.findUnique({
      where: { id: String(req.params.id) },
      include: { cart: true },
    }) as any

    if (!cartItem) {
      res.status(404).json({ ok: false, error: 'Item no encontrado' })
      return
    }

    if (cartItem.cart.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para eliminar este item' })
      return
    }

    await db.cartItem.delete({ where: { id: req.params.id as string } })

    res.json({ ok: true, data: { id: String(req.params.id) } })
  } catch (error) {
    console.error('Delete cart item error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar item del carrito' })
  }
})

router.delete('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cart = await db.cart.findUnique({ where: { userId: req.user!.userId } })

    if (!cart) {
      res.json({ ok: true, data: null })
      return
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id } })

    res.json({ ok: true, data: { id: cart.id } })
  } catch (error) {
    console.error('Clear cart error:', error)
    res.status(500).json({ ok: false, error: 'Error al limpiar carrito' })
  }
})

export default router
