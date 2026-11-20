import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import {
  fromMerchantTradeNo,
  orderUpdateForBinanceStatus,
  verifyBinanceWebhook,
} from '../services/binancePay'
import { applyBinancePaymentUpdate } from '../services/binancePaymentSync'

const router = Router()

const SUCCESS = { returnCode: 'SUCCESS', returnMessage: 'OK' }

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ returnCode: 'FAIL', returnMessage: message })
}

/**
 * POST /api/v1/webhooks/binance
 * Confirmación de pago de Binance Pay. Verifica la firma, ignora eventos que no
 * son de pago y es idempotente: un webhook repetido responde SUCCESS sin duplicar
 * notificaciones ni volver a mover el pedido.
 */
router.post('/binance', async (req: Request, res: Response) => {
  try {
    const rawBody =
      (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {})

    const verification = verifyBinanceWebhook(rawBody, req.headers)
    if (!verification.ok) {
      console.warn(`Binance webhook rechazado: ${verification.reason}`)
      fail(res, verification.reason === 'not_configured' ? 503 : 401, verification.reason ?? 'INVALID_SIGNATURE')
      return
    }

    const event = req.body ?? {}
    if (event.bizType && event.bizType !== 'PAY') {
      res.json({ returnCode: 'SUCCESS', returnMessage: 'IGNORED' })
      return
    }

    const tradeNo = event?.data?.merchantTradeNo
    const orderId = typeof tradeNo === 'string' ? fromMerchantTradeNo(tradeNo) : null
    if (!orderId) {
      fail(res, 400, 'INVALID_MERCHANT_TRADE_NO')
      return
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      fail(res, 404, 'ORDER_NOT_FOUND')
      return
    }

    const update = orderUpdateForBinanceStatus(event?.data?.status)
    if (!update) {
      res.json({ returnCode: 'SUCCESS', returnMessage: 'IGNORED' })
      return
    }

    if (update.paid) {
      const totalFee = Number(event?.data?.totalFee)
      if (Number.isFinite(totalFee) && Math.abs(totalFee - Number(order.total)) > 0.01) {
        console.warn(
          `Binance webhook con importe distinto para ${orderId}: esperado ${order.total}, recibido ${totalFee}`
        )
        fail(res, 400, 'AMOUNT_MISMATCH')
        return
      }
    }

    await applyBinancePaymentUpdate(order, update)

    res.json(SUCCESS)
  } catch (error) {
    console.error('Binance webhook error:', error)
    fail(res, 500, 'INTERNAL_ERROR')
  }
})

export default router
