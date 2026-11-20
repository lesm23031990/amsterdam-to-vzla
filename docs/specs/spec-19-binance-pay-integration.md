---
title: "Spec 19 — Binance Pay Integration"
labels: ["spec"]
assignees: []
status: done
---

## Endpoints

### POST /api/v1/checkout/pay/binance
Creates a Binance Pay order and returns payment URL.

### POST /api/v1/webhooks/binance
Receives payment confirmation from Binance (webhook).

### GET /api/v1/checkout/pay/binance/:orderId/status
Check Binance payment status.

## Request

### POST /api/v1/checkout/pay/binance
```json
{
  "orderId": "string",
  "amount": 25.50,
  "currency": "USD",
  "merchantId": "string (Binance merchant ID)"
}
```

Headers: `Authorization: Bearer <token>`

### POST /api/v1/webhooks/binance
```json
{
  "bizType": "PAY",
  "data": {
    "merchantTradeNo": "string",
    "tradeType": "WEB",
    "status": "PAY_SUCCESS",
    "totalFee": 25.50,
    "transactionId": "string"
  }
}
```

Headers: `BinancePay-Certificate-SN: <certificate-serial>`

## Response

### Éxito — 200 (create payment)
```json
{
  "ok": true,
  "data": {
    "paymentUrl": "https://www.binance.com/pay/...",
    "qrContent": "https://www.binance.com/pay/...",
    "prepayId": "string",
    "expiresAt": "2025-07-01T12:15:00Z"
  }
}
```

### Éxito — 200 (webhook)
```json
{
  "returnCode": "SUCCESS",
  "returnMessage": "OK"
}
```

### Error — 4xx
```json
{
  "ok": false,
  "error": "mensaje"
}
```

## Behavior
- When user selects Binance Pay at checkout, frontend calls `POST /checkout/pay/binance`
- Backend creates order via Binance Pay API using merchant credentials
- Returns payment URL and/or QR content
- Frontend shows QR code or "Pagar con Binance" button redirecting to URL
- Webhook endpoint `POST /webhooks/binance` receives payment confirmation
- Webhook validates signature using Binance public key
- On `PAY_SUCCESS`, order payment status updated to `paid`
- Frontend polls `GET /checkout/pay/binance/:orderId/status` every 5 seconds as fallback
- Payment timeout after 15 minutes if not confirmed
- On timeout, order marked as `payment_expired`
- Handle `PAY_CANCEL` and `PAY_CLOSED` statuses gracefully
- Binance API key and secret stored in env vars (`BINANCE_API_KEY`, `BINANCE_SECRET_KEY`)

## Implementación (2026-11-19)

La integración real quedó implementada (ya no hay link mock). Sin credenciales del
comercio los endpoints responden `503 { ok: false, code: 'not_configured' }` en vez de
inventar un `paymentUrl`, y el pedido queda en `pending_payment` + `pending`.

- Cliente Binance Pay (HMAC-SHA512, `timestamp\nnonce\nbody\n`, hex mayúsculas):
  `server/src/services/binancePay.ts:57` (`buildSignature`), `:67` (`buildSignedRequest`),
  `:196` (`createBinancePayOrder`), `:244` (`queryBinancePayOrder`),
  `:257`/`:262` (`toMerchantTradeNo`/`fromMerchantTradeNo` — UUID sin guiones),
  `:278` (`orderUpdateForBinanceStatus`), `:322` (`verifyBinanceWebhookSignature`:
  RSA con `BINANCE_PAY_PUBLIC_KEY` o HMAC con el secret, tolerancia anti-replay).
- `POST /api/v1/checkout/pay/binance`: `server/src/routes/binance.ts:32`
  (crea o reutiliza el link si ya existe `paymentUrl`).
- `GET /api/v1/checkout/pay/binance/:orderId/status`: `server/src/routes/binance.ts:131`
  (consulta Binance como respaldo y sincroniza).
- `POST /api/v1/webhooks/binance`: `server/src/routes/webhooks.ts:24` (body crudo
  capturado en `server/src/index.ts:35`, firma verificada, `bizType !== 'PAY'` ignorado,
  importe distinto rechazado).
- Sincronización idempotente (solo si el pago sigue `pending`) + notificación/push/socket:
  `server/src/services/binancePaymentSync.ts:18`.
- Ventana de pago de 15 minutos para `binance_pay` (24h para el resto):
  `server/src/services/orderExpiry.ts:11` y `:26` (`getPaymentExpiresAt`), expiración
  masiva por método en `:77`.
- Checkout hace primero el pedido y luego crea el pago (best-effort):
  `server/src/routes/checkout.ts`. Montaje de rutas: `server/src/index.ts:49`.
- Web: `apps/web/src/app/checkout/page.tsx:42` redirige al detalle; panel con link/copiar,
  error y cuenta atrás en `apps/web/src/app/orders/[id]/page.tsx:198` (link idempotente)
  y `:220` (polling cada 5s).
- Mobile: `apps/mobile/app/orders/[id].tsx:84` (link idempotente) y `:103` (polling 5s).
- Demo pública (Next API, sin credenciales): `apps/web/src/app/api/v1/[...slug]/route.ts:485`
  (`/checkout/pay/binance` → 503 `not_configured`) y `:506` (status con `expiresAt` 15 min).
- Variables: `.env.example` (`BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY`,
  `BINANCE_PAY_PUBLIC_KEY`, `BINANCE_PAY_API_BASE`; se aceptan los alias
  `BINANCE_API_KEY`/`BINANCE_SECRET_KEY`).
- Tests: `server/src/__tests__/binance-pay.test.ts` (firma con vector conocido, cliente HTTP,
  verificación de webhook, endpoints y webhook) — 173 tests en verde con `npx vitest run server`.

Desviación respecto al texto original: al vencer la ventana la orden se marca
`cancelled` + `paymentStatus: 'failed'` (no existe el estado `payment_expired` en el schema);
la UI lo muestra como "ventana de pago vencida".

## Acceptance Criteria
- [x] User can select Binance Pay at checkout
- [x] Redirect to Binance Pay or show QR
- [x] Webhook updates order status
- [x] Payment confirmed shown to user

---

## Tareas Técnicas
- [x] Write tests (TDD)
- [x] Implement Binance Pay API client (order creation)
- [x] Create `POST /api/v1/checkout/pay/binance` endpoint
- [x] Create `POST /api/v1/webhooks/binance` endpoint
- [x] Implement webhook signature verification
- [x] Create `GET /api/v1/checkout/pay/binance/:orderId/status` endpoint
- [x] Add Binance env vars to `.env.example`
- [x] Build Binance Pay checkout UI (QR / button)
- [x] Implement polling fallback on frontend
- [x] Handle payment timeout/expiry
- [x] Integrar con frontend
- [x] Integrar con mobile
- [x] PR a main
