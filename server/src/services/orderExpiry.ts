import { db } from '../lib/db'
import { OrderStatus } from '../generated/prisma/enums'

/** Horas que una orden puede permanecer pendiente de pago antes de expirar. */
export const PAYMENT_TIMEOUT_HOURS = 24

const PAYMENT_TIMEOUT_MS = PAYMENT_TIMEOUT_HOURS * 60 * 60 * 1000

export interface ExpirableOrder {
  id: string
  status: string
  paymentStatus: string
  createdAt: Date
}

/** Momento en que expira la ventana de pago de una orden: createdAt + 24h. */
export function getPaymentExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PAYMENT_TIMEOUT_MS)
}

function isPaymentWindowClosed(createdAt: Date, now: Date): boolean {
  return getPaymentExpiresAt(createdAt).getTime() <= now.getTime()
}

/**
 * Solo expiran órdenes que siguen esperando el pago (`pending_payment` + `pending`)
 * pasadas PAYMENT_TIMEOUT_HOURS. Nunca órdenes pagadas o en preparación/entrega.
 */
export function shouldExpireOrder(order: ExpirableOrder, now: Date = new Date()): boolean {
  return (
    order.status === OrderStatus.pending_payment &&
    order.paymentStatus === 'pending' &&
    isPaymentWindowClosed(order.createdAt, now)
  )
}

/**
 * Estado de expiración para la respuesta de `payment-status`.
 * Una orden pagada nunca expira, aunque haya pasado la ventana de 24h.
 */
export function isPaymentExpired(order: ExpirableOrder, now: Date = new Date()): boolean {
  if (order.paymentStatus === 'paid') return false
  if (order.status === OrderStatus.cancelled) return order.paymentStatus === 'failed'
  return shouldExpireOrder(order, now)
}

/**
 * Expiración perezosa por orden (sin cron): si la orden quedó pendiente de pago
 * más de PAYMENT_TIMEOUT_HOURS, se cancela y el pago pasa a `failed`.
 * Devuelve la orden actualizada o la misma si no aplica.
 */
export async function expireOrderIfNeeded<T extends ExpirableOrder>(order: T): Promise<T> {
  if (!shouldExpireOrder(order)) return order

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.cancelled, paymentStatus: 'failed' },
  })

  return { ...order, ...updated }
}

/**
 * Expiración masiva usada antes de listar órdenes. Devuelve cuántas órdenes cambió.
 */
export async function expirePendingOrders(userId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MS)

  const result = await db.order.updateMany({
    where: {
      ...(userId ? { userId } : {}),
      status: OrderStatus.pending_payment,
      paymentStatus: 'pending',
      createdAt: { lte: cutoff },
    },
    data: { status: OrderStatus.cancelled, paymentStatus: 'failed' },
  })

  return result.count
}
