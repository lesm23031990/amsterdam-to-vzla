import crypto from 'crypto'

/** Base URL de la API de Binance Pay (sobreescribible en tests con BINANCE_PAY_API_BASE). */
export const BINANCE_PAY_API_BASE = process.env.BINANCE_PAY_API_BASE || 'https://bpay.binanceapi.com'

/** Ventana de pago de Binance Pay: 15 minutos (spec-19). */
export const BINANCE_PAY_TIMEOUT_MINUTES = 15

/** Tolerancia de reloj aceptada al validar el timestamp del webhook. */
export const BINANCE_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000

export interface BinancePayCredentials {
  apiKey: string
  secretKey: string
}

/**
 * Error controlado de la integración. `httpStatus` es el código que debe
 * devolver la API propia (no el de Binance).
 */
export class BinancePayError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code = 'binance_error', httpStatus = 502) {
    super(message)
    this.name = 'BinancePayError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

/**
 * Credenciales desde el entorno. Se aceptan los dos nombres documentados
 * (`BINANCE_PAY_*` en `.env.example` y `BINANCE_*` en la spec).
 */
export function getBinancePayCredentials(): BinancePayCredentials | null {
  const apiKey = process.env.BINANCE_PAY_API_KEY || process.env.BINANCE_API_KEY
  const secretKey = process.env.BINANCE_PAY_SECRET_KEY || process.env.BINANCE_SECRET_KEY
  if (!apiKey || !secretKey) return null
  return { apiKey, secretKey }
}

export function isBinancePayConfigured(): boolean {
  return getBinancePayCredentials() !== null
}

/** Nonce de 32 caracteres alfanuméricos que exige Binance Pay. */
export function generateNonce(size = 32): string {
  return crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size).toUpperCase()
}

/**
 * Firma HMAC-SHA512 que usa Binance Pay: payload `timestamp\nnonce\nbody\n`
 * firmado con el secret y devuelto en hex mayúsculas.
 */
export function buildSignature(payload: string, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(payload, 'utf8').digest('hex').toUpperCase()
}

export interface SignedRequest {
  body: string
  headers: Record<string, string>
}

/** Construye el body serializado y las cabeceras firmadas de una petición. */
export function buildSignedRequest(
  body: string,
  credentials: BinancePayCredentials,
  options: { timestamp?: string; nonce?: string } = {}
): SignedRequest {
  const timestamp = options.timestamp ?? Date.now().toString()
  const nonce = options.nonce ?? generateNonce()
  const signature = buildSignature(`${timestamp}\n${nonce}\n${body}\n`, credentials.secretKey)

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'BinancePay-Timestamp': timestamp,
      'BinancePay-Nonce': nonce,
      'BinancePay-Certificate-SN': credentials.apiKey,
      'BinancePay-Signature': signature,
    },
  }
}

export interface BinancePayOrderInput {
  /** Referencia única del comercio (máx. 32 caracteres alfanuméricos). */
  merchantTradeNo: string
  amount: number
  currency?: string
  description?: string
}

export interface BinancePayOrderResult {
  prepayId: string
  paymentUrl: string
  qrContent: string
  expiresAt: Date
  raw: unknown
}

export interface BinanceHttpResponse {
  ok: boolean
  status: number
  json: () => Promise<any>
}

export type BinanceFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<BinanceHttpResponse>

export interface BinanceDeps {
  fetchImpl?: BinanceFetch
  now?: () => number
  credentials?: BinancePayCredentials | null
}

/** Binance Pay solo acepta estas monedas de cobro; el resto se convierte a USD. */
const BINANCE_CURRENCIES = ['USD', 'USDT', 'BUSD', 'BNB', 'BRL', 'EUR']

export function normalizeBinanceCurrency(currency?: string | null): string {
  const upper = (currency || 'USD').toUpperCase()
  return BINANCE_CURRENCIES.includes(upper) ? upper : 'USD'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Importe a cobrar en Binance. Si el pedido está en USD/USDT se usa su total;
 * si está en Bs/COP se convierte con la tasa COP→USD disponible.
 */
export function binanceAmountForOrder(
  order: { total: number; totalCop?: number | null; currency?: string | null },
  usdRate?: number | null
): number {
  const currency = (order.currency || 'USD').toUpperCase()
  if (currency === 'USD' || currency === 'USDT') return round2(order.total)

  const cop = Number(order.totalCop ?? 0)
  const rate = usdRate && usdRate > 0 ? usdRate : 0.024
  const amount = rate >= 1 ? cop / rate : cop * rate
  return round2(amount)
}

function resolveFetch(deps: BinanceDeps): BinanceFetch {
  if (deps.fetchImpl) return deps.fetchImpl
  if (typeof fetch !== 'function') {
    throw new BinancePayError('fetch no está disponible en este runtime', 'fetch_unavailable', 500)
  }
  return fetch as unknown as BinanceFetch
}

function resolveCredentials(deps: BinanceDeps): BinancePayCredentials {
  const credentials = deps.credentials === undefined ? getBinancePayCredentials() : deps.credentials
  if (!credentials) {
    throw new BinancePayError(
      'Binance Pay no está configurado. Define BINANCE_PAY_API_KEY y BINANCE_PAY_SECRET_KEY.',
      'not_configured',
      503
    )
  }
  return credentials
}

async function postSigned(path: string, body: string, deps: BinanceDeps): Promise<any> {
  const credentials = resolveCredentials(deps)
  const signed = buildSignedRequest(body, credentials, {
    timestamp: String(deps.now?.() ?? Date.now()),
  })
  const fetchImpl = resolveFetch(deps)

  const response = await fetchImpl(`${BINANCE_PAY_API_BASE}${path}`, {
    method: 'POST',
    headers: signed.headers,
    body: signed.body,
  })
  const json = await response.json().catch(() => ({}))

  if (!response.ok || json.status !== 'SUCCESS' || json.code !== '000000') {
    const message = json.errorMessage || `Binance Pay respondió con estado ${response.status}`
    throw new BinancePayError(message, json.code || 'binance_error', response.status >= 500 ? 502 : 400)
  }

  return json.data ?? {}
}

/**
 * Crea una orden en Binance Pay y normaliza la respuesta.
 * `merchantTradeNo` debe identificar de forma única el intento de pago.
 */
export async function createBinancePayOrder(
  input: BinancePayOrderInput,
  deps: BinanceDeps = {}
): Promise<BinancePayOrderResult> {
  const currency = normalizeBinanceCurrency(input.currency)
  const body = JSON.stringify({
    env: { terminalType: 'WEB' },
    merchantTradeNo: input.merchantTradeNo.slice(0, 32),
    orderAmount: round2(input.amount),
    currency,
    description: (input.description || 'Pedido amsterdamToVzla & asociados').slice(0, 100),
    goodsDetails: [
      {
        goodsType: '01',
        goodsCategory: 'D000',
        referenceGoodsId: input.merchantTradeNo.slice(0, 32),
        goodsName: 'Pedido amsterdamToVzla',
      },
    ],
  })

  const data = await postSigned('/binancepay/openapi/v3/order', body, deps)
  const paymentUrl = data.checkoutUrl || data.universalUrl || data.deeplink
  if (!data.prepayId || !paymentUrl) {
    throw new BinancePayError('Binance Pay no devolvió un enlace de pago', 'invalid_response', 502)
  }

  const now = deps.now?.() ?? Date.now()
  const expiresAt = data.expireTime
    ? new Date(Number(data.expireTime))
    : new Date(now + BINANCE_PAY_TIMEOUT_MINUTES * 60 * 1000)

  return {
    prepayId: String(data.prepayId),
    paymentUrl: String(paymentUrl),
    qrContent: String(data.qrContent || paymentUrl),
    expiresAt,
    raw: data,
  }
}

export interface BinancePayOrderQuery {
  merchantTradeNo: string
  status: string | null
  raw: unknown
}

/** Consulta el estado de una orden en Binance Pay (respaldo si se pierde el webhook). */
export async function queryBinancePayOrder(
  merchantTradeNo: string,
  deps: BinanceDeps = {}
): Promise<BinancePayOrderQuery> {
  const data = await postSigned(
    '/binancepay/openapi/v2/order/query',
    JSON.stringify({ merchantTradeNo: merchantTradeNo.slice(0, 32) }),
    deps
  )
  return { merchantTradeNo, status: data.status ? String(data.status) : null, raw: data }
}

/** UUID sin guiones: identificador de comercio aceptado por Binance (32 chars). */
export function toMerchantTradeNo(orderId: string): string {
  return orderId.replace(/-/g, '').toLowerCase().slice(0, 32)
}

/** Reconstruye el UUID de nuestra orden a partir del merchantTradeNo. */
export function fromMerchantTradeNo(merchantTradeNo: string): string | null {
  const raw = (merchantTradeNo || '').replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(raw)) return null
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
}

export interface BinanceOrderUpdate {
  paid: boolean
  paymentStatus: string
  orderStatus: 'confirmed' | 'cancelled'
}

/**
 * Traduce el estado del webhook/consulta de Binance Pay a los campos del pedido.
 * Devuelve `null` para estados que no cambian el pedido (pendiente o desconocido).
 */
export function orderUpdateForBinanceStatus(
  status: string | null | undefined
): BinanceOrderUpdate | null {
  switch ((status || '').toUpperCase()) {
    case 'PAY_SUCCESS':
      return { paid: true, paymentStatus: 'paid', orderStatus: 'confirmed' }
    case 'PAY_CLOSED':
    case 'PAY_CANCEL':
    case 'PAY_FAIL':
    case 'PAY_EXPIRED':
      return { paid: false, paymentStatus: 'failed', orderStatus: 'cancelled' }
    default:
      return null
  }
}

export interface WebhookSignatureInput {
  rawBody: string
  timestamp?: string
  nonce?: string
  signature?: string
  secretKey: string
  publicKey?: string | null
  now?: number
  toleranceMs?: number
}

export interface WebhookVerification {
  ok: boolean
  reason?: string
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

/**
 * Verifica la firma del webhook. Con `BINANCE_PAY_PUBLIC_KEY` (PEM) valida la
 * firma RSA-SHA256 que emite Binance; sin clave pública usa el fallback
 * HMAC-SHA512 con el secret del comercio (mismo payload que la firma de API).
 */
export function verifyBinanceWebhookSignature(input: WebhookSignatureInput): WebhookVerification {
  const { rawBody, timestamp, nonce, signature, secretKey, publicKey } = input

  if (!timestamp || !nonce || !signature) {
    return { ok: false, reason: 'missing_signature_headers' }
  }

  const parsedTimestamp = Number(timestamp)
  if (!Number.isFinite(parsedTimestamp)) {
    return { ok: false, reason: 'invalid_timestamp' }
  }

  const now = input.now ?? Date.now()
  const tolerance = input.toleranceMs ?? BINANCE_WEBHOOK_TOLERANCE_MS
  if (Math.abs(now - parsedTimestamp) > tolerance) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`

  if (publicKey) {
    try {
      const valid = crypto.verify('sha256', Buffer.from(payload), publicKey, Buffer.from(signature, 'base64'))
      return valid ? { ok: true } : { ok: false, reason: 'invalid_signature' }
    } catch {
      return { ok: false, reason: 'invalid_public_key' }
    }
  }

  const expectedHex = buildSignature(payload, secretKey)
  const expectedBase64 = Buffer.from(expectedHex, 'hex').toString('base64')
  if (safeEqual(signature.toUpperCase(), expectedHex) || safeEqual(signature, expectedBase64)) {
    return { ok: true }
  }
  return { ok: false, reason: 'invalid_signature' }
}

/** Verifica el webhook usando las credenciales del entorno y las cabeceras HTTP. */
export function verifyBinanceWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  now = Date.now()
): WebhookVerification {
  const credentials = getBinancePayCredentials()
  if (!credentials) return { ok: false, reason: 'not_configured' }

  const header = (name: string): string | undefined => {
    const value = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(value) ? value[0] : value
  }

  return verifyBinanceWebhookSignature({
    rawBody,
    timestamp: header('binancepay-timestamp'),
    nonce: header('binancepay-nonce'),
    signature: header('binancepay-signature'),
    secretKey: credentials.secretKey,
    publicKey: process.env.BINANCE_PAY_PUBLIC_KEY || null,
    now,
  })
}

