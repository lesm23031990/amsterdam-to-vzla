import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole, requireDriver } from '../middleware/auth'
import { io } from '../index'
import { OrderStatus } from '../generated/prisma/enums'
import { createNotification } from '../services/notifications'
import { assignDriverToOrder } from '../services/deliveryAssignment'

const router = Router()

const validTransitions: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const deliveryStatusTransitions: Record<string, string[]> = {
  assigned: ['accepted'],
  pending: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
}

const deliveryStatusLabels: Record<string, string> = {
  assigned: 'Asignado',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}


router.patch('/orders/:id/status', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body

    if (!status || !Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ ok: false, error: 'Estado inválido' })
      return
    }

    const order = await db.order.findUnique({
      where: { id: req.params.id as string },
    })

    if (!order) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    const allowedTransitions = validTransitions[order.status]
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      res.status(400).json({ ok: false, error: `No se puede cambiar de ${order.status} a ${status}` })
      return
    }

    const updated = await db.order.update({
      where: { id: req.params.id as string },
      data: { status },
    })

    const statusLabels: Record<string, string> = {
      pending_payment: 'Pendiente de pago',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      in_transit: 'En camino',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }

    await createNotification(
      order.userId,
      'order_status',
      `Pedido ${statusLabels[status] || status}`,
      `Tu pedido #${updated.id.slice(-6)} ahora está: ${statusLabels[status] || status}`,
      { orderId: updated.id, status: updated.status },
      updated.id
    )

    io.to(order.userId).emit('notification:new', {
      type: 'order_status',
      title: `Pedido ${statusLabels[status] || status}`,
      message: `Tu pedido #${updated.id.slice(-6)} ahora está: ${statusLabels[status] || status}`,
      orderId: updated.id,
    })

    io.emit('order:status', { orderId: updated.id, status: updated.status })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update order status error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar estado del pedido' })
  }
})

router.post('/orders/:id/assign', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { driverId } = req.body
    const result = await assignDriverToOrder(req.params.id as string, driverId)

    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error })
      return
    }

    res.status(201).json({ ok: true, data: result.delivery })
  } catch (error) {
    console.error('Assign driver error:', error)
    res.status(500).json({ ok: false, error: 'Error al asignar conductor' })
  }
})

router.get('/orders/:id/tracking', authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await db.order.findUnique({
      where: { id: req.params.id as string },
      include: {
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
      res.status(403).json({ ok: false, error: 'No autorizado para ver el tracking de este pedido' })
      return
    }

    const delivery = order.delivery
    if (!delivery) {
      res.json({ ok: true, data: null })
      return
    }

    const latestLocation = delivery.locations[0] || null

    res.json({
      ok: true,
      data: {
        deliveryId: delivery.id,
        status: delivery.status,
        driver: delivery.driver,
        latestLocation,
        orderStatus: order.status,
      },
    })
  } catch (error) {
    console.error('Tracking error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tracking' })
  }
})

// GET /api/v1/delivery/my-deliveries — deliveries asignados al repartidor autenticado
router.get('/my-deliveries', authMiddleware, requireDriver, async (req: Request, res: Response) => {
  try {
    const deliveries = await db.delivery.findMany({
      where: {
        driverId: req.user!.userId,
        status: { in: ['assigned', 'pending', 'accepted', 'picked_up', 'in_transit'] },
      },
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const data = deliveries.map((delivery) => ({
      id: delivery.id,
      orderId: delivery.orderId,
      customerName: delivery.order.user.name,
      contactPhone: delivery.order.contactPhone,
      deliveryAddress: delivery.order.deliveryAddress,
      status: delivery.status,
      total: delivery.order.total,
      currency: delivery.order.currency,
      items: delivery.order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      createdAt: delivery.createdAt,
    }))

    res.json({ ok: true, data: { deliveries: data } })
  } catch (error) {
    console.error('My deliveries error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tus entregas' })
  }
})

// PATCH /api/v1/delivery/:id/status — el repartidor avanza el estado de su entrega
router.patch('/delivery/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    const deliveryId = req.params.id as string
    const driverAllowedStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered']

    if (!status || !driverAllowedStatuses.includes(status)) {
      res.status(400).json({ ok: false, error: 'Estado inválido. Usa accepted, picked_up, in_transit o delivered' })
      return
    }

    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    })

    if (!delivery) {
      res.status(404).json({ ok: false, error: 'Delivery no encontrado' })
      return
    }

    if (delivery.driverId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para actualizar este delivery' })
      return
    }

    const allowedTransitions = deliveryStatusTransitions[delivery.status] || []
    if (!allowedTransitions.includes(status)) {
      res.status(400).json({
        ok: false,
        error: `No se puede cambiar de ${delivery.status} a ${status}`,
      })
      return
    }

    if (status === 'accepted' && delivery.order.status === 'pending_payment') {
      res.status(400).json({ ok: false, error: 'El pedido aún no está pagado' })
      return
    }

    const updated = await db.delivery.update({
      where: { id: delivery.id },
      data: { status },
    })

    let orderStatus = delivery.order.status
    const nextOrderStatus: OrderStatus =
      status === 'delivered' ? OrderStatus.delivered : status === 'in_transit' ? OrderStatus.in_transit : OrderStatus.preparing

    if (delivery.order.status !== 'delivered' && delivery.order.status !== 'cancelled' && delivery.order.status !== nextOrderStatus) {
      const updatedOrder = await db.order.update({
        where: { id: delivery.orderId },
        data: { status: nextOrderStatus },
      })
      orderStatus = updatedOrder.status
      io.emit('order:status', { orderId: delivery.orderId, status: orderStatus })
    }

    await db.driver
      .updateMany({
        where: { userId: delivery.driverId },
        data: { isOnline: status !== 'delivered' },
      })
      .catch(() => undefined)

    const label = deliveryStatusLabels[status] || status
    await createNotification(
      delivery.order.userId,
      'delivery_update',
      `Entrega ${label.toLowerCase()}`,
      `Tu pedido #${delivery.orderId.slice(-6)} está: ${label.toLowerCase()}`,
      { orderId: delivery.orderId, deliveryId: delivery.id, status },
      delivery.orderId
    )

    io.to(delivery.order.userId).emit('notification:new', {
      type: 'delivery_update',
      title: `Entrega ${label.toLowerCase()}`,
      message: `Tu pedido #${delivery.orderId.slice(-6)} está: ${label.toLowerCase()}`,
      orderId: delivery.orderId,
    })
    io.to(delivery.orderId).emit('delivery:status', {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      status,
      orderStatus,
    })
    io.emit('delivery:status', { deliveryId: delivery.id, orderId: delivery.orderId, status, orderStatus })

    res.json({ ok: true, data: { id: updated.id, status: updated.status, orderStatus } })
  } catch (error) {
    console.error('Update delivery status error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar estado del delivery' })
  }
})

router.patch('/delivery/:id/location', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ ok: false, error: 'lat y lng son requeridos' })
      return
    }

    const numericLat = Number(lat)
    const numericLng = Number(lng)
    if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
      res.status(400).json({ ok: false, error: 'lat y lng deben ser números válidos' })
      return
    }

    const delivery = await db.delivery.findUnique({
      where: { id: req.params.id as string },
      include: { driver: { select: { id: true } } },
    })

    if (!delivery) {
      res.status(404).json({ ok: false, error: 'Delivery no encontrado' })
      return
    }

    if (delivery.driverId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para actualizar ubicación' })
      return
    }

    // El repartidor solo comparte ubicación cuando la entrega está en camino.
    if (req.user!.role !== 'admin' && delivery.status !== 'in_transit') {
      res.status(400).json({ ok: false, error: 'Solo puedes compartir ubicación cuando el delivery está en tránsito' })
      return
    }

    const location = await db.deliveryLocation.create({
      data: {
        deliveryId: delivery.id,
        lat: numericLat,
        lng: numericLng,
      },
    })

    await db.driver
      .updateMany({
        where: { userId: delivery.driverId },
        data: { isOnline: true, lastLocationAt: new Date() },
      })
      .catch(() => undefined)

    io.to(delivery.orderId).emit('delivery:location', {
      orderId: delivery.orderId,
      lat: numericLat,
      lng: numericLng,
      timestamp: location.createdAt.toISOString(),
    })

    res.json({ ok: true, data: location })
  } catch (error) {
    console.error('Update location error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar ubicación' })
  }
})

export default router
