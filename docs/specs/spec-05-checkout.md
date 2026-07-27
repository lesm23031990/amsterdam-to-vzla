---
title: "Spec 05 — Checkout y Pagos: Binance Pay, efectivo, transferencia"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/checkout
Crear orden desde el carrito actual.

### GET /api/v1/orders
Listar órdenes del cliente autenticado.

### GET /api/v1/orders/:id
Ver detalle de orden.

### POST /api/v1/orders/:id/pay
Registrar pago de orden (efectivo/transferencia).

### GET /api/v1/orders/:id/payment-status
Consultar estado del pago.

## Request

### POST /api/v1/checkout
Headers: `Authorization: Bearer <token>`
```json
{
  "paymentMethod": "binance_pay | cash | transfer",
  "deliveryAddress": "Av. Principal, San Cristóbal",
  "notes": "Dejar en portería",
  "contactPhone": "+584141234567"
}
```

### POST /api/v1/orders/:id/pay
```json
{
  "paymentMethod": "cash | transfer",
  "referenceNumber": "REF-123456"
}
```

## Response

### POST /api/v1/checkout — 201
```json
{
  "ok": true,
  "data": {
    "orderId": "uuid",
    "status": "pending_payment",
    "total": 125.00,
    "currency": "USD",
    "items": [
      { "productId": "uuid", "name": "Producto X", "quantity": 2, "price": 25.00, "storeId": "uuid" }
    ],
    "groupedByStore": [
      {
        "storeId": "uuid",
        "storeName": "Mi Tienda",
        "items": [...],
        "subtotal": 50.00,
        "deliveryFee": 5.00
      }
    ],
    "paymentMethod": "binance_pay",
    "paymentUrl": "https://p2p.binance.com/...",
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

### GET /api/v1/orders/:id — 200
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "status": "pending_payment | confirmed | preparing | in_transit | delivered | cancelled",
    "total": 125.00,
    "currency": "USD",
    "paymentMethod": "binance_pay",
    "paymentStatus": "pending | paid | failed",
    "items": [...],
    "groupedByStore": [...],
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

## Behavior
- Checkout solo si carrito tiene items
- Al hacer checkout, carrito se convierte en orden y se vacía
- **Binance Pay:** generar link de pago P2P (mock inicial)
- **Efectivo/Transferencia:** cliente paga al repartidor o transfiere, marca como pagado después
- Cada tienda ve sus propios items en la orden (multi-tenant)
- Estado inicial: `pending_payment`
- Si pago falla o expira (24h), orden pasa a `cancelled`

## Acceptance Criteria
- [ ] Cliente puede hacer checkout de su carrito
- [ ] Orden se crea agrupada por tienda
- [ ] Pago con Binance Pay genera link de pago
- [ ] Pago en efectivo se registra con referencia
- [ ] Cliente puede ver historial de órdenes
- [ ] Cliente puede ver detalle de orden
- [ ] Orden expira después de 24h sin pago

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos Order, OrderItem a Prisma
- [ ] Integrar carrito → orden al hacer checkout
- [ ] Mock de Binance Pay (generar link)
- [ ] Implementar rutas de orden y pago
- [ ] PR a main
