---
title: "Spec 06 — Órdenes y Delivery: tracking en vivo con Socket.io + mapa"
labels: ["spec"]
assignees: []
status: done
---

## Endpoints

### GET /api/v1/admin/orders
Listar todas las órdenes (solo admin).

### PATCH /api/v1/delivery/orders/:id/status
Actualizar estado de orden (solo admin). `delivery.ts` monta el router en `/api/v1/delivery`, por eso la ruta pública es `/api/v1/delivery/orders/:id/status`.

### GET /api/v1/delivery/orders/:id/tracking
Obtener tracking de delivery (dueño del pedido o admin). Devuelve `data: null` si el pedido aún no tiene delivery.

### POST /api/v1/delivery/orders/:id/assign
Asignar repartidor a una orden (solo admin).

### PATCH /api/v1/delivery/:id/location
Actualizar ubicación del repartidor (dueño del delivery o admin; el repartidor solo puede compartir cuando la entrega está `in_transit`).

### PATCH /api/v1/delivery/:id/status
El repartidor avanza el estado de su entrega (`accepted | picked_up | in_transit | delivered`).

## WebSocket (Socket.io)

La conexión exige JWT: `io(url, { auth: { token } })`. El middleware `authenticateSocket` valida el token y guarda `socket.data.userId`/`role`; sin token válido la conexión se rechaza.

- `join` (userId): se une al room personal. Solo permite el propio `userId` (los admins pueden unirse a cualquiera).
- `join:order` (orderId, ack): se une al room del pedido. Verifica en DB que el pedido pertenezca al usuario autenticado (o que sea admin) y responde `{ ok, error? }`.

### Event: `delivery:location` → room del pedido
```json
{
  "orderId": "uuid",
  "lat": 7.7719,
  "lng": -72.2270,
  "timestamp": "2026-07-27T00:00:00.000Z"
}
```

### Event: `delivery:status` → room del pedido
```json
{
  "deliveryId": "uuid",
  "orderId": "uuid",
  "status": "accepted | picked_up | in_transit | delivered",
  "orderStatus": "preparing | in_transit | delivered"
}
```

### Event: `order:status` → room del pedido + room personal del cliente
```json
{
  "orderId": "uuid",
  "status": "confirmed | preparing | in_transit | delivered"
}
```

## Request

### PATCH /api/v1/orders/:id/status
Headers: `Authorization: Bearer <token>` (admin)
```json
{
  "status": "confirmed | preparing | in_transit | delivered | cancelled"
}
```

### POST /api/v1/orders/:id/assign-delivery
Headers: `Authorization: Bearer <token>` (admin)
```json
{
  "deliveryPersonId": "uuid-del-repartidor"
}
```

## Behavior
- **Estados:** `pending_payment` → `confirmed` → `preparing` → `in_transit` → `delivered`
- Admin confirma orden (pasa a `preparing`)
- Admin asigna repartidor disponible (la asignación emite `order:status` scoped a la room del pedido)
- Repartidor actualiza ubicación vía `PATCH /api/v1/delivery/:id/location` y el backend emite `delivery:location` al room del pedido
- Cliente recibe eventos de estado y ubicación en su room personal y en el room del pedido (nunca broadcasts globales)
- Mapa Leaflet muestra la posición del repartidor sobre OpenStreetMap
- Historial de ubicaciones guardado en DB
- Delivery asignado a 1 repartidor por orden
- Todas las órdenes pertenecen a Amsterdam Frozen Foods (no multi-tenant)

## Acceptance Criteria
- [x] Admin ve todas las órdenes en dashboard
- [x] Admin puede cambiar estado de orden
- [x] Admin puede asignar repartidor (backend `POST /api/v1/delivery/orders/:id/assign` + UI en `/admin/drivers`)
- [x] Repartidor puede actualizar ubicación
- [x] Cliente recibe updates en tiempo real via Socket.io
- [x] Historial de ubicaciones se guarda
- [x] Mapa muestra posición del repartidor

---

## Tareas Técnicas
- [x] Escribir tests (TDD)
- [x] Agregar modelos Delivery, DeliveryLocation a Prisma
- [x] Implementar cambio de estado con validaciones
- [x] Integrar Socket.io para eventos en tiempo real
- [x] Guardar historial de ubicaciones
- [x] Endpoint de tracking para el cliente
- [x] Endpoint GET /admin/orders para admin
- [x] Autenticar conexiones Socket.io con JWT (rechaza sockets anónimos)
- [x] Rooms por pedido con `join:order` validado contra DB
- [x] Emitir `order:status`/`delivery:status`/`delivery:location` solo a rooms del pedido y del cliente
- [x] Unificar rutas de repartidor en `/api/v1/delivery/:id/status` y `/api/v1/delivery/:id/location`
- [x] Mapa Leaflet en `/orders/[id]` (`OrderMap`, SSR deshabilitado, tiles OSM)
- [x] PR a main

## Verificación UI de tracking

Ruta: `/orders/[id]` (web) y `app/orders/[id].tsx` (mobile).

1. El pedido debe estar en estado `in_transit` para mostrar la sección "Seguimiento en vivo".
2. Web: `OrderMap` (Leaflet, `dynamic(..., { ssr: false })`) centra en San Cristóbal `[7.7713, -72.2218]` y muestra "Esperando ubicación del repartidor..." hasta recibir coordenadas.
3. Al recibir `delivery:location` (socket) o al refrescar por polling (15s mientras `in_transit`), el marcador se mueve y el mapa auto-centra.
4. Si el usuario arrastra el mapa más de ~150 m, aparece el botón "Centrar" para volver al repartidor.
5. El header muestra nombre y teléfono del repartidor (`tel:` link en web, `Linking` en mobile).
6. Mobile: tarjeta con repartidor, botón de llamada y hora de última ubicación (mapa nativo = backlog).
7. Fallback sin sockets (demo Vercel): el polling de 15s mantiene el tracking actualizado.
8. Verificado con `npx tsc -p server --noEmit`, `npx tsc -p apps/web --noEmit`, `tsc -p apps/mobile`, `npx vitest run` y `npm run specs`.
