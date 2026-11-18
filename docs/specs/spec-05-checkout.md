---
title: "Spec 05 — Checkout y Pagos: Binance Pay, efectivo, transferencia"
labels: ["spec"]
assignees: []
status: done
---

> El router está montado en `/api/v1/checkout` (`server/src/index.ts`), por eso los
> endpoints reales de órdenes viven bajo ese prefijo. No existe alias `/api/v1/orders`.

## Endpoints

### POST /api/v1/checkout
Crear orden desde el carrito actual.

### GET /api/v1/checkout/orders
Listar órdenes del cliente autenticado (aplica expiración perezosa de 24h).

### GET /api/v1/checkout/orders/:id
Ver detalle de orden (aplica expiración perezosa de 24h).

### POST /api/v1/checkout/orders/:id/pay
Registrar pago de orden (efectivo/transferencia).

### GET /api/v1/checkout/orders/:id/payment-status
Consultar estado del pago, vencimiento y link de pago (dueño o `admin`).

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

### POST /api/v1/checkout/orders/:id/pay
```json
{
  "paymentMethod": "cash | transfer",
  "referenceNumber": "REF-123456"
}
```

> Nota: el endpoint real recibe `paymentRef` (y opcionalmente `paymentProof`).

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
    "deliveryFee": 5.00,
    "items": [
      { "productId": "uuid", "name": "Producto X", "quantity": 2, "price": 25.00 }
    ],
    "paymentMethod": "binance_pay",
    "paymentUrl": "https://mock.binance.com/pay/temp-<userId>-<timestamp>",
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

### GET /api/v1/checkout/orders/:id — 200
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "status": "pending_payment | confirmed | preparing | in_transit | delivered | cancelled",
    "total": 125.00,
    "currency": "USD",
    "paymentMethod": "binance_pay",
    "paymentStatus": "pending | pending_review | paid | failed",
    "items": [...],
    "deliveryAddress": "Av. Principal, San Cristóbal",
    "deliveryFee": 5.00,
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

### GET /api/v1/checkout/orders/:id/payment-status — 200
```json
{
  "ok": true,
  "data": {
    "orderId": "uuid",
    "orderStatus": "pending_payment | confirmed | cancelled | ...",
    "paymentMethod": "binance_pay | cash | transfer",
    "paymentStatus": "pending | pending_review | paid | failed",
    "paymentRef": null,
    "paymentUrl": "https://mock.binance.com/pay/temp-<userId>-<timestamp>",
    "expiresAt": "2026-11-18T23:00:00.000Z",
    "expired": false
  }
}
```

### Errores — 4xx
- `400` carrito vacío, método de pago inválido o falta `paymentRef`.
- `401` sin token válido.
- `403` orden de otro usuario (solo dueño o `admin`).
- `404` orden inexistente.

## Behavior
- Checkout solo si carrito tiene items
- Al hacer checkout, carrito se convierte en orden y se vacía
- **Binance Pay (mock MVP):** se genera `paymentUrl` mock (`https://mock.binance.com/pay/temp-<userId>-<timestamp>`) y la orden queda en `pending_payment` + `pending`. La integración real se difiere a la spec 19 (post-MVP).
- **Efectivo/Transferencia:** cliente paga al repartidor o transfiere, marca como pagado después
- Estado inicial: `pending_payment` (Binance Pay) o `confirmed` (efectivo/transferencia)
- **Expiración 24h (perezosa, sin cron):** antes de listar órdenes, ver detalle, consultar estado de pago o listar órdenes en el panel admin, las órdenes `pending_payment` + `pending` con `createdAt <= now - 24h` pasan a `cancelled` + `failed`. Nunca expiran órdenes `paid`, `confirmed`, `preparing`, `in_transit`, `delivered` ni ya `cancelled`. `GET /api/v1/admin/orders` aplica la expiración sin filtro de usuario (server y demo Vercel).
- `expiresAt` = `createdAt + 24h`; una orden pagada nunca expira (`expired: false`).
- Orden pertenece a Amsterdam Frozen Foods (no multi-tenant)
- Tarifa de delivery única para toda la orden (no por tienda)

## Acceptance Criteria
- [x] Cliente puede hacer checkout de su carrito
- [x] Orden se crea con todos los items del carrito
- [x] Pago con Binance Pay genera link de pago (mock MVP)
- [x] Pago en efectivo se registra con referencia
- [x] Cliente puede ver historial de órdenes
- [x] Cliente puede ver detalle de orden
- [x] Cliente puede consultar el estado del pago (`payment-status`)
- [x] Cliente ve el link de pago Binance y la fecha de vencimiento en la UI (web y mobile)
- [x] La UI avisa cuando la ventana de pago venció y la orden fue cancelada
- [x] Orden expira después de 24h sin pago
- [x] Admin ve las órdenes expiradas como canceladas al listar

---

## Tareas Técnicas
- [x] Escribir tests (TDD)
- [x] Modelos Order, OrderItem en Prisma
- [x] Integrar carrito → orden al hacer checkout
- [x] Mock de Binance Pay (generar link)
- [x] Implementar rutas de orden y pago
- [x] Implementar `GET /orders/:id/payment-status`
- [x] Implementar expiración perezosa de 24h (`server/src/services/orderExpiry.ts`)
- [x] Paridad mínima en demo Vercel (`payment-status` + expiración en memoria)
- [x] UI web consume `payment-status` (`apps/web/src/app/orders/[id]/page.tsx`): link "Pagar con Binance", vencimiento y aviso de expiración
- [x] UI mobile consume `payment-status` (`apps/mobile/app/orders/[id].tsx`): link de pago, vencimiento y aviso de expiración
- [x] Corregir endpoints de órdenes en mobile (`/api/v1/checkout/orders`) y mapear enums reales (`pending_payment`, `in_transit`, `deliveryAddress`)
- [x] Expiración perezosa global en `GET /api/v1/admin/orders` (server + demo)
- [x] Trabajo publicado en `main` (push directo, sin PR)

## Verificación (2026-11-17)

**Comandos ejecutados** (desde la raíz del repo):

```powershell
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p server/tsconfig.json
npx vitest run
npm run build -w apps/web
git diff --check
git status --short
```

**Resultado:**
- `tsc` web y server: sin errores.
- `vitest run`: todos los tests en verde (incluye los nuevos de checkout,
  `payment-status`, permisos dueño/admin, 404 y expiración 24h).
- `npm run build -w apps/web`: exit code `0`.
- `git diff --check`: sin problemas de whitespace.

**Endpoint implementado:** `GET /api/v1/checkout/orders/:id/payment-status`
- JWT obligatorio; solo dueño de la orden o `admin` (`403` en caso contrario, `404` si no existe).
- Devuelve `orderStatus`, `paymentMethod`, `paymentStatus`, `paymentRef`, `paymentUrl`,
  `expiresAt` (`createdAt + 24h`) y `expired`.
- Antes de responder ejecuta la expiración perezosa: si la orden llevaba más de 24h
  pendiente de pago se cancela (`cancelled` + `failed`) y `expired: true`.
- La misma expiración se aplica en `GET /checkout/orders` (masiva con `order.updateMany`)
  y en `GET /checkout/orders/:id`.

**Decisión Binance:** el MVP usa el mock existente (link `https://mock.binance.com/pay/...`);
no se implementa API real, webhooks, firma ni QR. La integración real queda diferida a la
spec 19 (`status: archived`, post-MVP).

**Paridad demo Vercel:** `apps/web/src/app/api/v1/[...slug]/route.ts` replica la expiración
perezosa (incluido `GET /admin/orders`) y `payment-status` en memoria. La UI web y la mobile
consumen `payment-status` para mostrar el link de pago, el vencimiento y el aviso de expiración.

## Verificación UI de pago (2026-11-17)

**Comandos ejecutados** (desde la raíz del repo):

```powershell
npx tsc --noEmit -p apps/web/tsconfig.json      # exit 0
npx tsc --noEmit -p server/tsconfig.json        # exit 0
node apps/mobile/node_modules/typescript/bin/tsc -p apps/mobile/tsconfig.json --noEmit  # exit 0
npx vitest run                                  # 130/130 en verde
npm run build -w apps/web                       # Compiled successfully
git diff --check                                # sin problemas
```

**Cambios:**
- Web `orders/[id]`: sección "Pago con Binance Pay" con botón al `paymentUrl`, fecha límite
  (`expiresAt`) y bloque de aviso cuando `expired`/`cancelled`. Se añadió la fila
  "Estado del pago" con el `paymentStatus`.
- Mobile `orders/[id]`: mismo comportamiento con `Linking.openURL`; se corrigieron endpoint
  (`/api/v1/checkout/orders/...`), `deliveryAddress`, `currency`, enums reales
  (`pending_payment`, `in_transit`) y precios.
- Mobile lista de pedidos: endpoint corregido, `items` como array, moneda real y enums nuevos.
- Backend: `GET /admin/orders` ejecuta `expirePendingOrders()` (global) antes de listar; la
  demo Vercel hace lo mismo con `expireStaleOrders()`.
- Tests: nuevo caso "GET /admin/orders applies lazy expiry to every user before listing".
