import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import {
  BinancePayError,
  binanceAmountForOrder,
  createBinancePayOrder,
  isBinancePayConfigured,
  orderUpdateForBinanceStatus,
  queryBinancePayOrder,
  toMerchantTradeNo,
} from '../services/binancePay'
import { applyBinancePaymentUpdate } from '../services/binancePaymentSync'
import { expireOrderIfNeeded, getPaymentExpiresAt, isPaymentExpired } from '../services/orderExpiry'

const router = Router()

async function resolveUsdRate(): Promise<number | undefined> {
  try {
    const rates = await db.exchangeRate.findMany()
    const usd = rates.find((rate: { currency: string; rate: number }) => rate.currency === 'USD')
    return usd?.rate
  } catch {
    return undefined
  }
}

/**
 * POST /api/v1/checkout/pay/binance
 * Crea (o reutiliza) la orden de pago en Binance Pay para un pedido propio.
 */
router.post('/binance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body ?? {}
    if (!orderId) {
      res.status(400).json({ ok: false, error: 'orderId es requerido' })
      return
    }

    const found = await db.order.findUnique({ where: { id: orderId } })
    if (!found) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    if (found.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para pagar este pedido' })
      return
    }

    if (found.paymentMethod !== 'binance_pay') {
      res.status(400).json({ ok: false, error: 'Este pedido no usa Binance Pay' })
      return
    }

    if (found.paymentStatus === 'paid') {
      res.status(400).json({ ok: false, error: 'Este pedido ya fue pagado' })
      return
    }

    const order = await expireOrderIfNeeded(found)
    if (isPaymentExpired(order)) {
      res.status(400).json({ ok: false, error: 'La ventana de pago de 15 minutos venció' })
      return
    }

    const expiresAt = getPaymentExpiresAt(order.createdAt, 'binance_pay')

    // Idempotente: si ya existe un link vigente se reutiliza.
    if (order.paymentUrl) {
      res.json({
        ok: true,
        data: {
          paymentUrl: order.paymentUrl,
          qrContent: order.paymentUrl,
          prepayId: order.paymentRef ?? null,
          expiresAt: expiresAt.toISOString(),
          reused: true,
        },
      })
      return
    }

    if (!isBinancePayConfigured()) {
      res.status(503).json({
        ok: false,
        error: 'Binance Pay no está configurado',
        code: 'not_configured',
      })
      return
    }

    const usdRate = await resolveUsdRate()
    const created = await createBinancePayOrder({
      merchantTradeNo: toMerchantTradeNo(order.id),
      amount: binanceAmountForOrder(order, usdRate),
      currency: 'USD',
      description: `Pedido #${order.id.slice(-6)}`,
    })

    const updated = await db.order.update({
      where: { id: order.id },
      data: { paymentUrl: created.paymentUrl, paymentRef: created.prepayId },
    })

    res.json({
      ok: true,
      data: {
        paymentUrl: updated.paymentUrl ?? created.paymentUrl,
        qrContent: created.qrContent,
        prepayId: created.prepayId,
        expiresAt: expiresAt.toISOString(),
        reused: false,
      },
    })
  } catch (error) {
    if (error instanceof BinancePayError) {
      res.status(error.httpStatus).json({ ok: false, error: error.message, code: error.code })
      return
    }
    console.error('Binance create payment error:', error)
    res.status(500).json({ ok: false, error: 'Error al crear el pago con Binance Pay' })
  }
})

/**
 * GET /api/v1/checkout/pay/binance/:orderId/status
 * Estado del pago. Si sigue pendiente y hay credenciales, consulta Binance
 * como respaldo del webhook y sincroniza el pedido.
 */
router.get('/binance/:orderId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const found = await db.order.findUnique({ where: { id: req.params.orderId as string } })
    if (!found) {
      res.status(404).json({ ok: false, error: 'Pedido no encontrado' })
      return
    }

    if (found.userId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado para ver este pedido' })
      return
    }

    let order = await expireOrderIfNeeded(found)

    if (order.paymentStatus === 'pending' && isBinancePayConfigured()) {
      try {
        const remote = await queryBinancePayOrder(toMerchantTradeNo(order.id))
        const update = orderUpdateForBinanceStatus(remote.status)
        if (update && (await applyBinancePaymentUpdate(order, update))) {
          const refreshed = await db.order.findUnique({ where: { id: order.id } })
          if (refreshed) order = { ...order, ...refreshed }
        }
      } catch (error) {
        // Un fallo de Binance no debe romper el polling del cliente.
        console.warn('Binance pay query error:', error)
      }
    }

    const expiresAt = getPaymentExpiresAt(order.createdAt, 'binance_pay')

    res.json({
      ok: true,
      data: {
        orderId: order.id,
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentRef: order.paymentRef ?? null,
        paymentUrl: order.paymentUrl ?? null,
        paidAt: order.paymentStatus === 'paid' ? order.updatedAt ?? null : null,
        expiresAt: expiresAt.toISOString(),
        expired: isPaymentExpired(order),
      },
    })
  } catch (error) {
    console.error('Binance payment status error:', error)
    res.status(500).json({ ok: false, error: 'Error al consultar el estado del pago' })
  }
})

export default router
