import { db } from '../lib/db'
import { OrderStatus } from '../generated/prisma/enums'
import { createNotification } from './notifications'
import { sendPushToUser } from './push'
import { io } from '../index'

export interface AssignedDelivery {
  id: string
  orderId: string
  driverId: string
  status: string
  createdAt: Date
}

export type AssignDeliveryResult =
  | { ok: true; delivery: AssignedDelivery }
  | { ok: false; status: number; error: string }

/**
 * Crea el delivery de un pedido y lo asigna a un repartidor activo.
 * Usado por POST /delivery/orders/:id/assign y POST /admin/deliveries.
 */
export async function assignDriverToOrder(orderId: string, driverId: string): Promise<AssignDeliveryResult> {
  if (!driverId) {
    return { ok: false, status: 400, error: 'driverId es requerido' }
  }

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) {
    return { ok: false, status: 404, error: 'Pedido no encontrado' }
  }

  const driverUser = await db.user.findUnique({ where: { id: driverId } })
  if (!driverUser) {
    return { ok: false, status: 400, error: 'El usuario seleccionado no existe' }
  }

  const driverProfile = await db.driver.findUnique({ where: { userId: driverId } })
  if (!driverProfile || !driverProfile.isActive) {
    return { ok: false, status: 400, error: 'El usuario seleccionado no es un repartidor activo' }
  }

  const existing = await db.delivery.findUnique({ where: { orderId: order.id } })
  if (existing) {
    return { ok: false, status: 409, error: 'Este pedido ya tiene un conductor asignado' }
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
    io.to(order.id).to(order.userId).emit('order:status', {
      orderId: order.id,
      status: OrderStatus.preparing,
    })
  }

  await createNotification(
    order.userId,
    'driver_assigned',
    'Conductor asignado',
    `Tu pedido #${order.id.slice(-6)} tiene un conductor asignado: ${driverUser.name}`,
    { orderId: order.id, driverId, driverName: driverUser.name },
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

  void sendPushToUser(order.userId, {
    title: 'Conductor asignado',
    body: `Tu pedido #${order.id.slice(-6)} tiene un conductor asignado: ${driverUser.name}`,
    data: { orderId: order.id },
  })

  void sendPushToUser(driverId, {
    title: 'Nueva entrega asignada',
    body: `Te han asignado la entrega del pedido #${order.id.slice(-6)}`,
    data: { orderId: order.id },
  })

  io.to(order.userId).emit('notification:new', {
    type: 'driver_assigned',
    title: 'Conductor asignado',
    message: `Tu pedido #${order.id.slice(-6)} tiene un conductor: ${driverUser.name}`,
    orderId: order.id,
  })

  io.to(driverId).emit('notification:new', {
    type: 'delivery_update',
    title: 'Nueva entrega',
    message: `Te han asignado la entrega del pedido #${order.id.slice(-6)}`,
    orderId: order.id,
  })

  return { ok: true, delivery }
}
