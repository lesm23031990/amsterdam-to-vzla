import { Router, Request, Response } from 'express'
import type { Prisma } from '../generated/prisma/client'
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

interface CustomizationInput {
  optionId?: string
  choiceId?: string
}

interface ResolvedCustomization {
  optionId: string
  choiceId: string
  optionName: string
  choiceName: string
  priceModifier: number
}

function choiceIdsOf(customizations: unknown): string[] {
  if (!Array.isArray(customizations)) return []
  return customizations
    .map((c: any) => String(c?.choiceId ?? ''))
    .filter(Boolean)
    .sort()
}

async function addMenuItemToCart(
  req: Request,
  res: Response,
  menuItemId: string,
  qty: number,
  customizationsInput: unknown
) {
  const menu = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: { options: { include: { choices: true } } },
  })

  if (!menu || !menu.isAvailable) {
    res.status(404).json({ ok: false, error: 'Elemento del menú no encontrado o no disponible' })
    return
  }

  const inputs: CustomizationInput[] = Array.isArray(customizationsInput)
    ? (customizationsInput as CustomizationInput[])
    : []

  if (!Array.isArray(customizationsInput) && customizationsInput !== undefined && customizationsInput !== null) {
    res.status(400).json({ ok: false, error: 'customizations debe ser un arreglo' })
    return
  }

  const resolved: ResolvedCustomization[] = []
  const seenChoiceIds = new Set<string>()

  for (const input of inputs) {
    const option = menu.options.find((o) => o.id === input.optionId)
    if (!option) {
      res.status(400).json({ ok: false, error: 'Opción de personalización no válida' })
      return
    }
    const choice = option.choices.find((c) => c.id === input.choiceId)
    if (!choice) {
      res.status(400).json({ ok: false, error: 'La elección no pertenece a la opción seleccionada' })
      return
    }
    if (seenChoiceIds.has(choice.id)) continue
    seenChoiceIds.add(choice.id)
    resolved.push({
      optionId: option.id,
      choiceId: choice.id,
      optionName: option.name,
      choiceName: choice.name,
      priceModifier: choice.priceModifier,
    })
  }

  for (const option of menu.options) {
    const selected = resolved.filter((r) => r.optionId === option.id)
    if (option.type === 'single' && selected.length > 1) {
      res.status(400).json({ ok: false, error: `La opción "${option.name}" solo permite una elección` })
      return
    }
    if (option.required && selected.length < 1) {
      res.status(400).json({ ok: false, error: `Debes elegir una opción para "${option.name}"` })
      return
    }
  }

  const unitPrice =
    Math.round((menu.basePrice + resolved.reduce((sum, r) => sum + r.priceModifier, 0)) * 100) / 100

  const cart = await getOrCreateCart(req.user!.userId)

  const existingLines = await db.cartItem.findMany({
    where: { cartId: cart.id, menuItemId },
  })

  const wantedIds = choiceIdsOf(resolved)
  const match = existingLines.find(
    (line) => JSON.stringify(choiceIdsOf(line.customizations)) === JSON.stringify(wantedIds)
  )

  let cartItem
  if (match) {
    cartItem = await db.cartItem.update({
      where: { id: match.id },
      data: { quantity: match.quantity + qty },
    })
  } else {
    cartItem = await db.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId,
        quantity: qty,
        price: unitPrice,
        customizations: resolved as unknown as Prisma.InputJsonValue,
      },
    })
  }

  res.status(201).json({ ok: true, data: cartItem })
}

router.post('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { productId, menuItemId, quantity, customizations } = req.body
    const qty = quantity || 1

    if (!productId && !menuItemId) {
      res.status(400).json({ ok: false, error: 'productId o menuItemId es requerido' })
      return
    }

    if (qty < 1) {
      res.status(400).json({ ok: false, error: 'La cantidad debe ser mayor a 0' })
      return
    }

    if (menuItemId) {
      await addMenuItemToCart(req, res, String(menuItemId), qty, customizations)
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
                brand: { select: { id: true, name: true, slug: true, logoImage: true } },
              },
            },
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
                preparationTime: true,
                category: true,
              },
            },
          },
        },
      },
    })

    if (!cart) {
      res.json({ ok: true, data: { id: null, items: [], total: 0, totalItems: 0 } })
      return
    }

    const items = cart.items.map((item: any) => {
      if (item.productId) {
        const { menuItem: _omit, ...productItem } = item
        return { ...productItem, type: 'product' as const }
      }
      return {
        ...item,
        type: 'menu' as const,
        menuItem: item.menuItem ?? null,
        customizations: item.customizations ?? [],
      }
    })

    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0)

    res.json({
      ok: true,
      data: {
        id: cart.id,
        items,
        total,
        totalItems,
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

    if (cartItem.productId && quantity > cartItem.product.stock) {
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
