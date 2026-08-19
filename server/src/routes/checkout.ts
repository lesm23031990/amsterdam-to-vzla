import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { OrderStatus, PaymentMethod } from '../generated/prisma/enums'
import { createNotification } from '../services/notifications'
import { io } from '../index'

const router = Router()

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { paymentMethod, deliveryAddress, notes, contactPhone, currency, deliveryFee, paymentProof } = req.body
    const userId = req.user!.userId

    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, priceCop: true },
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

    const totalCop = cart.items.reduce((sum: number, item: any) => sum + (item.product.priceCop || 0) * item.quantity, 0)
    const fee = deliveryFee ?? 0
    const grandTotalCop = totalCop + fee

    const rates = await db.exchangeRate.findMany()
    const rateMap: Record<string, number> = { COP: 1 }
    for (const r of rates) {
      rateMap[r.currency] = r.rate
    }
    if (!rateMap['Bs']) rateMap['Bs'] = 36.50
    if (!rateMap['USD']) rateMap['USD'] = 0.024

    const targetCurrency = currency || 'COP'
    const rate = rateMap[targetCurrency] || 1
    const grandTotal = targetCurrency === 'COP' ? grandTotalCop : grandTotalCop / rate

    const orderData: any = {
      userId,
      total: Math.round(grandTotal * 100) / 100,
      totalCop: grandTotalCop,
      deliveryFee: fee,
      currency: targetCurrency,
      paymentMethod,
      paymentStatus: paymentMethod === 'binance_pay' ? 'pending' : (paymentProof ? 'pending_review' : 'pending'),
      paymentProof: paymentProof || null,
      deliveryAddress: deliveryAddress || null,
      notes: notes || null,
      contactPhone: contactPhone || null,
      status: paymentMethod === 'binance_pay' ? OrderStatus.pending_payment : OrderStatus.confirmed,
      items: {
        create: cart.items.map((item: any) => ({
          productId: item.productId,
          name: item.product.name,
          price: Math.round(((item.product.priceCop || 0) / rate) * 100) / 100,
          quantity: item.quantity,
          subtotal: Math.round(((item.product.priceCop || 0) * item.quantity / rate) * 100) / 100,
        })),
      },
    }

    if (paymentMethod === 'binance_pay') {
      const tempId = `temp-${userId}-${Date.now()}`
      orderData.paymentUrl = `https://mock.binance.com/pay/${tempId}`
    }

    const order = await db.order.create({ data: orderData })

    await db.cartItem.deleteMany({ where: { cartId: cart.id } })

    await createNotification(
      userId,
      'order_status',
      'Pedido creado',
      `Tu pedido #${order.id.slice(-6)} ha sido creado exitosamente`,
      { orderId: order.id, status: order.status },
      order.id
    )

    io.to(userId).emit('notification:new', {
      type: 'order_status',
      title: 'Pedido creado',
      message: `Tu pedido #${order.id.slice(-6)} ha sido creado`,
      orderId: order.id,
    })

    res.status(201).json({ ok: true, data: order })
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
        delivery: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
            locations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
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
        paymentStatus: 'pending_review',
        paymentProof: paymentProof || null,
      },
    })

    await createNotification(
      userId,
      'payment_confirmed',
      'Comprobante de pago enviado',
      `Tu comprobante para el pedido #${updated.id.slice(-6)} ha sido recibido y está en revisión`,
      { orderId: updated.id, paymentRef },
      updated.id
    )

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Pay order error:', error)
    res.status(500).json({ ok: false, error: 'Error al registrar pago' })
  }
})

export default router
