import { db } from '../lib/db'
import { OrderStatus } from '../generated/prisma/enums'
import { BINANCE_PAY_TIMEOUT_MINUTES } from './binancePay'

/** Horas que una orden puede permanecer pendiente de pago antes de expirar. */
export const PAYMENT_TIMEOUT_HOURS = 24

const PAYMENT_TIMEOUT_MS = PAYMENT_TIMEOUT_HOURS * 60 * 60 * 1000

/** Binance Pay cierra su ventana de pago a los 15 minutos (spec-19). */
const BINANCE_PAY_TIMEOUT_MS = BINANCE_PAY_TIMEOUT_MINUTES * 60 * 1000

export interface ExpirableOrder {
  id: string
  status: string
  paymentStatus: string
  createdAt: Date
  paymentMethod?: string | null
}

/**
 * Momento en que expira la ventana de pago de una orden: createdAt + 24h,
 * o createdAt + 15 minutos cuando el pago es con Binance Pay.
 */
export function getPaymentExpiresAt(createdAt: Date, paymentMethod?: string | null): Date {
  const timeoutMs = paymentMethod === 'binance_pay' ? BINANCE_PAY_TIMEOUT_MS : PAYMENT_TIMEOUT_MS
  return new Date(createdAt.getTime() + timeoutMs)
}

function isPaymentWindowClosed(createdAt: Date, paymentMethod: string | null | undefined, now: Date): boolean {
  return getPaymentExpiresAt(createdAt, paymentMethod).getTime() <= now.getTime()
}

/**
 * Solo expiran órdenes que siguen esperando el pago (`pending_payment` + `pending`)
 * pasadas PAYMENT_TIMEOUT_HOURS. Nunca órdenes pagadas o en preparación/entrega.
 */
export function shouldExpireOrder(order: ExpirableOrder, now: Date = new Date()): boolean {
  return (
    order.status === OrderStatus.pending_payment &&
    order.paymentStatus === 'pending' &&
    isPaymentWindowClosed(order.createdAt, order.paymentMethod, now)
  )
}

/**
 * Estado de expiración para la respuesta de `payment-status`.
 * Una orden pagada nunca expira, aunque haya pasado la ventana de pago.
 * La ventana es de 15 minutos para Binance Pay y de 24h para el resto.
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
 * Binance Pay expira a los 15 minutos; el resto de métodos a las 24h.
 */
export async function expirePendingOrders(userId?: string): Promise<number> {
  const base = {
    ...(userId ? { userId } : {}),
    status: OrderStatus.pending_payment,
    paymentStatus: 'pending',
  }
  const data = { status: OrderStatus.cancelled, paymentStatus: 'failed' }
  const now = Date.now()

  const [binance, others] = await Promise.all([
    db.order.updateMany({
      where: {
        ...base,
        paymentMethod: 'binance_pay',
        createdAt: { lte: new Date(now - BINANCE_PAY_TIMEOUT_MS) },
      },
      data,
    }),
    db.order.updateMany({
      where: {
        ...base,
        paymentMethod: { not: 'binance_pay' },
        createdAt: { lte: new Date(now - PAYMENT_TIMEOUT_MS) },
      },
      data,
    }),
  ])

  return binance.count + others.count
}
