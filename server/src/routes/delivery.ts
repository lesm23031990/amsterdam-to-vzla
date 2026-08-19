import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { io } from '../index'
import { OrderStatus } from '../generated/prisma/enums'
import { createNotification } from '../services/notifications'

const router = Router()

const validTransitions: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
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

    if (!driverId) {
      res.status(400).json({ ok: false, error: 'driverId es requerido' })
      return
    }

    const order = await db.order.findUnique({
      where: { id: req.params.id as string },
    })

    if (!order) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    const driver = await db.user.findUnique({ where: { id: driverId } })
    if (!driver) {
      res.status(400).json({ ok: false, error: 'El usuario seleccionado no existe' })
      return
    }

    const existing = await db.delivery.findUnique({ where: { orderId: order.id } })
    if (existing) {
      res.status(409).json({ ok: false, error: 'Este pedido ya tiene un conductor asignado' })
      return
    }

    const delivery = await db.delivery.create({
      data: {
        orderId: order.id,
        driverId,
        status: 'assigned',
      },
    })

    if (order.status === OrderStatus.confirmed) {
      await db.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.preparing },
      })
    }

    await createNotification(
      order.userId,
      'driver_assigned',
      'Conductor asignado',
      `Tu pedido #${order.id.slice(-6)} tiene un conductor asignado: ${driver.name}`,
      { orderId: order.id, driverId, driverName: driver.name },
      order.id
    )

    await createNotification(
      driverId,
      'delivery_update',
      'Nueva entrega asignada',
      `Te han asignado la entrega del pedido #${order.id.slice(-6)}`,
      { orderId: order.id },
      order.id
    )

    io.to(order.userId).emit('notification:new', {
      type: 'driver_assigned',
      title: 'Conductor asignado',
      message: `Tu pedido #${order.id.slice(-6)} tiene un conductor: ${driver.name}`,
      orderId: order.id,
    })

    io.to(driverId).emit('notification:new', {
      type: 'delivery_update',
      title: 'Nueva entrega',
      message: `Te han asignado la entrega del pedido #${order.id.slice(-6)}`,
      orderId: order.id,
    })

    res.status(201).json({ ok: true, data: delivery })
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

router.patch('/delivery/:id/location', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ ok: false, error: 'lat y lng son requeridos' })
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

    const location = await db.deliveryLocation.create({
      data: {
        deliveryId: delivery.id,
        lat,
        lng,
      },
    })

    io.emit('delivery:location', {
      orderId: delivery.orderId,
      lat,
      lng,
      timestamp: location.createdAt.toISOString(),
    })

    res.json({ ok: true, data: location })
  } catch (error) {
    console.error('Update location error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar ubicación' })
  }
})

export default router
