import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { OrderStatus, PaymentMethod } from '../generated/prisma/enums'

const router = Router()

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { paymentMethod, deliveryAddress, notes, contactPhone, currency } = req.body
    const userId = req.user!.userId

    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, storeId: true, store: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ ok: false, error: 'El carrito está vacío' })
      return
    }

    const validMethod: string[] = Object.values(PaymentMethod)
    if (!paymentMethod || !validMethod.includes(paymentMethod)) {
      res.status(400).json({ ok: false, error: 'Método de pago inválido' })
      return
    }

    const grouped: Record<string, typeof cart.items> = {}
    for (const item of cart.items) {
      const storeId = item.product.storeId
      if (!grouped[storeId]) grouped[storeId] = []
      grouped[storeId].push(item)
    }

    const orders = []

    for (const [storeId, items] of Object.entries(grouped)) {
      const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)

      const orderData: any = {
        userId,
        storeId,
        total,
        currency: currency || 'USD',
        paymentMethod,
        paymentStatus: paymentMethod === 'binance_pay' ? 'pending' : 'pending',
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        contactPhone: contactPhone || null,
        status: paymentMethod === 'binance_pay' ? OrderStatus.pending_payment : OrderStatus.confirmed,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.product.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        },
      }

      if (paymentMethod === 'binance_pay') {
        const tempId = `temp-${userId}-${storeId}-${Date.now()}`
        orderData.paymentUrl = `https://mock.binance.com/pay/${tempId}`
      }

      const order = await db.order.create({ data: orderData })
      orders.push(order)
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id } })

    res.status(201).json({ ok: true, data: orders })
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ ok: false, error: 'Error al procesar el checkout' })
  }
})

router.get('/orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orders = await db.order.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        store: { select: { id: true, name: true, slug: true } },
      },
    })
    res.json({ ok: true, data: orders })
  } catch (error) {
    console.error('List orders error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar pedidos' })
  }
})

router.get('/orders/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await db.order.findUnique({
      where: { id: req.params.id as string },
      include: {
        items: true,
        store: { select: { id: true, name: true, slug: true } },
        delivery: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
            locations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    if (order.userId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para ver este pedido' })
      return
    }

    res.json({ ok: true, data: order })
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener pedido' })
  }
})

router.post('/orders/:id/pay', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { paymentRef } = req.body

    if (!paymentRef) {
      res.status(400).json({ ok: false, error: 'Número de referencia es requerido' })
      return
    }

    const order = await db.order.findUnique({ where: { id: req.params.id as string } })

    if (!order) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    if (order.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para pagar este pedido' })
      return
    }

    if (order.paymentMethod !== 'cash' && order.paymentMethod !== 'transfer') {
      res.status(400).json({ ok: false, error: 'Este pedido no requiere pago manual' })
      return
    }

    if (order.paymentStatus === 'paid') {
      res.status(400).json({ ok: false, error: 'Este pedido ya fue pagado' })
      return
    }

    const updated = await db.order.update({
      where: { id: req.params.id as string },
      data: {
        paymentRef,
        paymentStatus: 'paid',
        status: OrderStatus.confirmed,
      },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Pay order error:', error)
    res.status(500).json({ ok: false, error: 'Error al registrar pago' })
  }
})

export default router
