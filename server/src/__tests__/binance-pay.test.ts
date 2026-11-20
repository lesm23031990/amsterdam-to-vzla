import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import http from 'http'
import jwt from 'jsonwebtoken'
import {
  BinancePayError,
  binanceAmountForOrder,
  buildSignature,
  buildSignedRequest,
  createBinancePayOrder,
  fromMerchantTradeNo,
  normalizeBinanceCurrency,
  orderUpdateForBinanceStatus,
  queryBinancePayOrder,
  toMerchantTradeNo,
  verifyBinanceWebhookSignature,
} from '../services/binancePay'

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    brand: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    productComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    productReport: { findUnique: vi.fn(), create: vi.fn() },
    stockNotification: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    menuItemComment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    cart: { findUnique: vi.fn(), upsert: vi.fn() },
    cartItem: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    orderItem: { findMany: vi.fn() },
    delivery: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    deliveryLocation: { create: vi.fn() },
    driver: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    menuOption: { create: vi.fn() },
    conversation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    exchangeRate: { findMany: vi.fn(), upsert: vi.fn() },
    notification: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    pushToken: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../services/push', () => ({
  EXPO_PUSH_URL: 'https://exp.host/--/api/v2/push/send',
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

const { app } = await import('../index')
const mockDb = (await vi.importMock('../lib/db')).db
const { createNotification } = await vi.importMock('../services/notifications')

type MockFn = ReturnType<typeof vi.fn>

function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return
      const raw = typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: addr.port,
        path,
        method,
        headers: { 'Content-Type': 'application/json', ...headers } as any,
      }
      if (raw) (options.headers as any)['Content-Length'] = Buffer.byteLength(raw)
      if (token) (options.headers as any)['Authorization'] = `Bearer ${token}`
      const req = http.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : {} })
        })
      })
      req.on('error', (err) => { server.close(); reject(err) })
      if (raw) req.write(raw)
      req.end()
    })
  })
}

const clienteToken = jwt.sign(
  { userId: 'user-1', role: 'cliente', email: 'cliente@test.com' },
  'dev-secret-change-in-prod',
  { expiresIn: '1h' }
)

const NOW = new Date(Date.now() - 60 * 1000)
const ORDER_ID = '11111111-2222-3333-4444-555555555555'

const pendingBinanceOrder = {
  id: ORDER_ID,
  userId: 'user-1',
  status: 'pending_payment',
  total: 25.5,
  totalCop: 107100,
  deliveryFee: 0,
  currency: 'USD',
  paymentMethod: 'binance_pay',
  paymentStatus: 'pending',
  paymentRef: null,
  paymentUrl: null,
  paymentProof: null,
  deliveryAddress: 'San Cristóbal',
  notes: null,
  contactPhone: '+584241234567',
  createdAt: NOW,
  updatedAt: NOW,
}

function binanceSuccess(paymentUrl = 'https://pay.binance.com/checkout/abc'): any {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'SUCCESS',
      code: '000000',
      data: {
        prepayId: 'PREPAY-1',
        checkoutUrl: paymentUrl,
        qrContent: 'https://pay.binance.com/qr/abc',
        expireTime: NOW.getTime() + 15 * 60 * 1000,
      },
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('BINANCE_PAY_API_KEY', 'test-api-key')
  vi.stubEnv('BINANCE_PAY_SECRET_KEY', 'test-secret')
  vi.stubEnv('BINANCE_PAY_PUBLIC_KEY', '')
  ;(mockDb.exchangeRate.findMany as MockFn).mockResolvedValue([{ currency: 'USD', rate: 4200 }])
  // Ningún test debe salir a internet: cada test que necesite HTTP lo re-define.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch no permitido en tests')))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})


describe('Binance Pay — firma y utilidades', () => {
  it('buildSignature genera HMAC-SHA512 hex en mayúsculas (vector conocido)', () => {
    const signature = buildSignature('1712345678\nNONCE123\n{"a":1}\n', 'secret')
    expect(signature).toBe(
      'A43A2B6D3B4F4457F6E67EACB1634F3014A174F52DCF7ECFCFD5442B4FED58FC330291E74EDB8618D288103B025F3695DEEA5654EFD022F356C64A12B654F27A'
    )
  })

  it('buildSignedRequest usa timestamp/nonce recibidos y el secret para firmar', () => {
    const body = JSON.stringify({ merchantTradeNo: 'abc', orderAmount: 10 })
    const signed = buildSignedRequest(body, { apiKey: 'api-key', secretKey: 'secret' }, {
      timestamp: '1712345678',
      nonce: 'NONCE123',
    })

    expect(signed.headers['BinancePay-Timestamp']).toBe('1712345678')
    expect(signed.headers['BinancePay-Nonce']).toBe('NONCE123')
    expect(signed.headers['BinancePay-Certificate-SN']).toBe('api-key')
    expect(signed.headers['BinancePay-Signature']).toBe(
      buildSignature(`1712345678\nNONCE123\n${body}\n`, 'secret')
    )
    expect(signed.body).toBe(body)
  })

  it('normalizeBinanceCurrency mapea Bs/COP a USD y respeta USDT', () => {
    expect(normalizeBinanceCurrency('Bs')).toBe('USD')
    expect(normalizeBinanceCurrency('COP')).toBe('USD')
    expect(normalizeBinanceCurrency('usdt')).toBe('USDT')
    expect(normalizeBinanceCurrency(undefined)).toBe('USD')
  })

  it('binanceAmountForOrder convierte Bs/COP a USD con la tasa disponible', () => {
    expect(binanceAmountForOrder({ total: 25.5, currency: 'USD' })).toBe(25.5)
    expect(binanceAmountForOrder({ total: 100000, totalCop: 107100, currency: 'Bs' }, 4200)).toBe(25.5)
    expect(binanceAmountForOrder({ total: 100000, totalCop: 100000, currency: 'COP' }, 0.024)).toBe(2400)
  })

  it('toMerchantTradeNo/fromMerchantTradeNo hacen roundtrip del UUID', () => {
    const tradeNo = toMerchantTradeNo(ORDER_ID)
    expect(tradeNo).toBe('11111111222233334444555555555555')
    expect(tradeNo).toHaveLength(32)
    expect(fromMerchantTradeNo(tradeNo)).toBe(ORDER_ID)
    expect(fromMerchantTradeNo('no-es-un-uuid')).toBeNull()
  })

  it('orderUpdateForBinanceStatus traduce los estados de Binance', () => {
    expect(orderUpdateForBinanceStatus('PAY_SUCCESS')).toEqual({
      paid: true, paymentStatus: 'paid', orderStatus: 'confirmed',
    })
    expect(orderUpdateForBinanceStatus('PAY_CLOSED')).toEqual({
      paid: false, paymentStatus: 'failed', orderStatus: 'cancelled',
    })
    expect(orderUpdateForBinanceStatus('PAY_CANCEL')).toEqual({
      paid: false, paymentStatus: 'failed', orderStatus: 'cancelled',
    })
    expect(orderUpdateForBinanceStatus('PENDING')).toBeNull()
    expect(orderUpdateForBinanceStatus(null)).toBeNull()
  })
})

describe('Binance Pay — cliente HTTP', () => {
  it('createBinancePayOrder firma la petición y normaliza la respuesta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(binanceSuccess())

    const result = await createBinancePayOrder(
      {
        merchantTradeNo: toMerchantTradeNo(ORDER_ID),
        amount: 25.5,
        currency: 'Bs',
        description: 'Pedido #555555',
      },
      { fetchImpl, now: () => NOW.getTime() }
    )

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('/binancepay/openapi/v3/order')
    expect(init.method).toBe('POST')
    expect(init.headers['BinancePay-Certificate-SN']).toBe('test-api-key')
    expect(init.headers['BinancePay-Nonce']).toHaveLength(32)

    const body = JSON.parse(init.body)
    expect(body.merchantTradeNo).toBe('11111111222233334444555555555555')
    expect(body.orderAmount).toBe(25.5)
    expect(body.currency).toBe('USD')
    expect(body.env.terminalType).toBe('WEB')

    expect(result.prepayId).toBe('PREPAY-1')
    expect(result.paymentUrl).toBe('https://pay.binance.com/checkout/abc')
    expect(result.qrContent).toBe('https://pay.binance.com/qr/abc')
    expect(result.expiresAt.toISOString()).toBe(new Date(NOW.getTime() + 15 * 60 * 1000).toISOString())
  })

  it('createBinancePayOrder falla con not_configured si faltan credenciales', async () => {
    const fetchImpl = vi.fn()

    await expect(
      createBinancePayOrder({ merchantTradeNo: 'abc', amount: 10 }, { fetchImpl, credentials: null })
    ).rejects.toMatchObject({ code: 'not_configured', httpStatus: 503 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('createBinancePayOrder propaga el errorMessage de Binance', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ status: 'FAIL', code: '400002', errorMessage: 'Invalid signature' }),
    })

    await expect(
      createBinancePayOrder({ merchantTradeNo: 'abc', amount: 10 }, { fetchImpl })
    ).rejects.toBeInstanceOf(BinancePayError)
    await expect(
      createBinancePayOrder({ merchantTradeNo: 'abc', amount: 10 }, { fetchImpl })
    ).rejects.toMatchObject({ message: 'Invalid signature', code: '400002' })
  })

  it('queryBinancePayOrder devuelve el estado remoto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SUCCESS', code: '000000', data: { status: 'PAY_SUCCESS' } }),
    })

    const result = await queryBinancePayOrder('abc', { fetchImpl })

    expect(result.status).toBe('PAY_SUCCESS')
    expect(fetchImpl.mock.calls[0][0]).toContain('/binancepay/openapi/v2/order/query')
  })
})

describe('Binance Pay — verificación del webhook', () => {
  const timestamp = '1712345678'
  const nonce = 'NONCE123'
  const rawBody = JSON.stringify({ bizType: 'PAY', data: { merchantTradeNo: 'abc', status: 'PAY_SUCCESS' } })
  const signature = buildSignature(`${timestamp}\n${nonce}\n${rawBody}\n`, 'test-secret')

  it('acepta la firma HMAC correcta', () => {
    const result = verifyBinanceWebhookSignature({
      rawBody, timestamp, nonce, signature, secretKey: 'test-secret', now: Number(timestamp),
    })
    expect(result).toEqual({ ok: true })
  })

  it('acepta la firma en base64', () => {
    const base64 = Buffer.from(signature, 'hex').toString('base64')
    const result = verifyBinanceWebhookSignature({
      rawBody, timestamp, nonce, signature: base64, secretKey: 'test-secret', now: Number(timestamp),
    })
    expect(result.ok).toBe(true)
  })

  it('rechaza firmas inválidas', () => {
    const result = verifyBinanceWebhookSignature({
      rawBody, timestamp, nonce, signature: 'DEADBEEF', secretKey: 'test-secret', now: Number(timestamp),
    })
    expect(result).toMatchObject({ ok: false, reason: 'invalid_signature' })
  })

  it('rechaza timestamps fuera de la tolerancia (replay)', () => {
    const result = verifyBinanceWebhookSignature({
      rawBody, timestamp, nonce, signature, secretKey: 'test-secret',
      now: Number(timestamp) + 10 * 60 * 1000,
    })
    expect(result).toMatchObject({ ok: false, reason: 'stale_timestamp' })
  })

  it('rechaza cabeceras faltantes', () => {
    const result = verifyBinanceWebhookSignature({ rawBody, secretKey: 'test-secret' })
    expect(result).toMatchObject({ ok: false, reason: 'missing_signature_headers' })
  })
})

describe('POST /api/v1/checkout/pay/binance', () => {
  it('crea el pago y guarda paymentUrl/paymentRef en el pedido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binanceSuccess()))
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    ;(mockDb.order.update as MockFn).mockImplementation((args: any) =>
      Promise.resolve({ ...pendingBinanceOrder, ...args.data })
    )

    const res = await request('POST', '/api/v1/checkout/pay/binance', { orderId: ORDER_ID }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.paymentUrl).toBe('https://pay.binance.com/checkout/abc')
    expect(res.body.data.qrContent).toBe('https://pay.binance.com/qr/abc')
    expect(res.body.data.prepayId).toBe('PREPAY-1')
    expect(res.body.data.reused).toBe(false)
    expect(res.body.data.expiresAt).toBe(new Date(NOW.getTime() + 15 * 60 * 1000).toISOString())
    expect(mockDb.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { paymentUrl: 'https://pay.binance.com/checkout/abc', paymentRef: 'PREPAY-1' },
    })
  })

  it('reutiliza el link existente sin llamar a Binance (idempotente)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({
      ...pendingBinanceOrder,
      paymentUrl: 'https://pay.binance.com/checkout/prev',
      paymentRef: 'PREPAY-PREV',
    })

    const res = await request('POST', '/api/v1/checkout/pay/binance', { orderId: ORDER_ID }, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.data.reused).toBe(true)
    expect(res.body.data.paymentUrl).toBe('https://pay.binance.com/checkout/prev')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })

  it('devuelve 503 not_configured sin credenciales', async () => {
    vi.stubEnv('BINANCE_PAY_API_KEY', '')
    vi.stubEnv('BINANCE_PAY_SECRET_KEY', '')
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)

    const res = await request('POST', '/api/v1/checkout/pay/binance', { orderId: ORDER_ID }, clienteToken)

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ ok: false, code: 'not_configured' })
  })

  it('devuelve 403 si el pedido es de otro usuario', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({ ...pendingBinanceOrder, userId: 'user-2' })

    const res = await request('POST', '/api/v1/checkout/pay/binance', { orderId: ORDER_ID }, clienteToken)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/checkout/pay/binance/:orderId/status', () => {
  it('expone la ventana de 15 minutos y el estado pendiente', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SUCCESS', code: '000000', data: { status: 'PAY_PENDING' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await request('GET', `/api/v1/checkout/pay/binance/${ORDER_ID}/status`, undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(res.body.data.paymentStatus).toBe('pending')
    expect(res.body.data.expiresAt).toBe(new Date(NOW.getTime() + 15 * 60 * 1000).toISOString())
    expect(res.body.data.expired).toBe(false)
    // Consulta a Binance como respaldo del webhook, sin mutar el pedido.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockDb.order.updateMany).not.toHaveBeenCalled()
  })

  it('sincroniza el pedido si Binance ya reporta PAY_SUCCESS', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    ;(mockDb.order.updateMany as MockFn).mockResolvedValue({ count: 1 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SUCCESS', code: '000000', data: { status: 'PAY_SUCCESS' } }),
    }))

    const res = await request('GET', `/api/v1/checkout/pay/binance/${ORDER_ID}/status`, undefined, clienteToken)

    expect(res.status).toBe(200)
    expect(mockDb.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, paymentStatus: 'pending' },
      data: { status: 'confirmed', paymentStatus: 'paid' },
    })
    expect(createNotification).toHaveBeenCalled()
  })
})



function signedWebhook(
  payload: Record<string, unknown>,
  secret = 'test-secret',
  timestamp = Date.now().toString(),
  nonce = 'NONCE-WEBHOOK-1'
) {
  const raw = JSON.stringify(payload)
  const signature = buildSignature(`${timestamp}\n${nonce}\n${raw}\n`, secret)
  return {
    raw,
    headers: {
      'BinancePay-Timestamp': timestamp,
      'BinancePay-Nonce': nonce,
      'BinancePay-Signature': signature,
    },
  }
}

function payEvent(status: string, totalFee = 25.5) {
  return {
    bizType: 'PAY',
    data: {
      merchantTradeNo: toMerchantTradeNo(ORDER_ID),
      tradeType: 'WEB',
      status,
      totalFee,
      currency: 'USDT',
      transactionId: 'TX-123',
    },
  }
}

describe('POST /api/v1/webhooks/binance', () => {
  it('PAY_SUCCESS marca el pedido como pagado y notifica', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    ;(mockDb.order.updateMany as MockFn).mockResolvedValue({ count: 1 })
    const event = signedWebhook(payEvent('PAY_SUCCESS'))

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ returnCode: 'SUCCESS', returnMessage: 'OK' })
    expect(mockDb.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, paymentStatus: 'pending' },
      data: { status: 'confirmed', paymentStatus: 'paid' },
    })
    expect(createNotification).toHaveBeenCalledWith(
      'user-1', 'payment_confirmed', 'Pago confirmado',
      expect.stringContaining('confirmado'), expect.objectContaining({ orderId: ORDER_ID }), ORDER_ID
    )
  })

  it('es idempotente: un webhook repetido no vuelve a notificar', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue({ ...pendingBinanceOrder, paymentStatus: 'paid' })
    ;(mockDb.order.updateMany as MockFn).mockResolvedValue({ count: 0 })
    const event = signedWebhook(payEvent('PAY_SUCCESS'))

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(200)
    expect(res.body.returnCode).toBe('SUCCESS')
    expect(createNotification).not.toHaveBeenCalled()
  })

  it('PAY_CANCEL cancela el pedido sin marcarlo pagado', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    ;(mockDb.order.updateMany as MockFn).mockResolvedValue({ count: 1 })
    const event = signedWebhook(payEvent('PAY_CANCEL'))

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(200)
    expect(mockDb.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, paymentStatus: 'pending' },
      data: { status: 'cancelled', paymentStatus: 'failed' },
    })
    expect(createNotification).toHaveBeenCalledWith(
      'user-1', 'order_status', 'Pago no completado',
      expect.any(String), expect.objectContaining({ orderId: ORDER_ID }), ORDER_ID
    )
  })

  it('rechaza una firma inválida sin tocar el pedido', async () => {
    const event = signedWebhook(payEvent('PAY_SUCCESS'), 'otro-secret')

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(401)
    expect(res.body.returnCode).toBe('FAIL')
    expect(mockDb.order.updateMany).not.toHaveBeenCalled()
  })

  it('rechaza un importe distinto al del pedido', async () => {
    ;(mockDb.order.findUnique as MockFn).mockResolvedValue(pendingBinanceOrder)
    const event = signedWebhook(payEvent('PAY_SUCCESS', 99))

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(400)
    expect(res.body.returnMessage).toBe('AMOUNT_MISMATCH')
    expect(mockDb.order.updateMany).not.toHaveBeenCalled()
  })

  it('ignora eventos que no son de pago', async () => {
    const event = signedWebhook({ bizType: 'OTHER', data: {} })

    const res = await request('POST', '/api/v1/webhooks/binance', event.raw, undefined, event.headers)

    expect(res.status).toBe(200)
    expect(res.body.returnMessage).toBe('IGNORED')
  })
})
