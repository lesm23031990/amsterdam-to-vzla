import { db } from '../lib/db'
import { createNotification } from './notifications'
import { sendPushToUser } from './push'
import { io } from '../index'
import type { BinanceOrderUpdate } from './binancePay'

export interface SyncableOrder {
  id: string
  userId: string
}

/**
 * Aplica un cambio de estado confirmado por Binance Pay (webhook o polling).
 * Es idempotente: solo transiciona pedidos que siguen en `paymentStatus: 'pending'`,
 * por lo que un webhook repetido o un pago tardío no pisa un estado final.
 * Devuelve `true` si actualizó el pedido.
 */
export async function applyBinancePaymentUpdate(
  order: SyncableOrder,
  update: BinanceOrderUpdate
): Promise<boolean> {
  const result = await db.order.updateMany({
    where: { id: order.id, paymentStatus: 'pending' },
    data: { status: update.orderStatus, paymentStatus: update.paymentStatus },
  })

  if (result.count === 0) return false

  const shortId = order.id.slice(-6)

  if (update.paid) {
    await createNotification(
      order.userId,
      'payment_confirmed',
      'Pago confirmado',
      `Tu pago del pedido #${shortId} fue confirmado con Binance Pay`,
      { orderId: order.id, paymentStatus: 'paid', provider: 'binance_pay' },
      order.id
    )

    void sendPushToUser(order.userId, {
      title: 'Pago confirmado',
      body: `Tu pedido #${shortId} ya está confirmado y en preparación`,
      data: { orderId: order.id },
    })

    io.to(order.userId).emit('order:status', { orderId: order.id, status: update.orderStatus })
  } else {
    await createNotification(
      order.userId,
      'order_status',
      'Pago no completado',
      `El pago del pedido #${shortId} no se completó y el pedido fue cancelado`,
      { orderId: order.id, paymentStatus: update.paymentStatus, provider: 'binance_pay' },
      order.id
    )

    io.to(order.userId).emit('order:status', { orderId: order.id, status: update.orderStatus })
  }

  return true
}
