---
title: "Spec 19 — Binance Pay Integration"
labels: ["spec"]
assignees: []
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

## Acceptance Criteria
- [ ] User can select Binance Pay at checkout
- [ ] Redirect to Binance Pay or show QR
- [ ] Webhook updates order status
- [ ] Payment confirmed shown to user

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Implement Binance Pay API client (order creation)
- [ ] Create `POST /api/v1/checkout/pay/binance` endpoint
- [ ] Create `POST /api/v1/webhooks/binance` endpoint
- [ ] Implement webhook signature verification
- [ ] Create `GET /api/v1/checkout/pay/binance/:orderId/status` endpoint
- [ ] Add Binance env vars to `.env.example`
- [ ] Build Binance Pay checkout UI (QR / button)
- [ ] Implement polling fallback on frontend
- [ ] Handle payment timeout/expiry
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
