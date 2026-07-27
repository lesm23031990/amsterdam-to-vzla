---
title: "Spec 06 — Órdenes y Delivery: tracking en vivo con Socket.io + mapa"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/stores/:id/orders
Listar órdenes entrantes de una tienda (solo dueño).

### PATCH /api/v1/orders/:id/status
Actualizar estado de orden (dueño de tienda o repartidor).

### GET /api/v1/orders/:id/tracking
Obtener tracking de delivery.

### POST /api/v1/orders/:id/assign-delivery
Asignar repartidor a una orden (dueño de tienda o admin).

### PATCH /api/v1/delivery/:id/location
Actualizar ubicación del repartidor en tiempo real (Socket.io + REST).

## WebSocket (Socket.io)

### Event: `delivery:location`
```json
{
  "orderId": "uuid",
  "lat": 7.7719,
  "lng": -72.2270,
  "timestamp": "2026-07-27T00:00:00.000Z"
}
```

### Event: `order:status`
```json
{
  "orderId": "uuid",
  "status": "confirmed | preparing | in_transit | delivered"
}
```

## Request

### PATCH /api/v1/orders/:id/status
Headers: `Authorization: Bearer <token>`
```json
{
  "status": "confirmed | preparing | in_transit | delivered | cancelled"
}
```

### POST /api/v1/orders/:id/assign-delivery
Headers: `Authorization: Bearer <token>`
```json
{
  "deliveryPersonId": "uuid-del-repartidor"
}
```

## Behavior
- **Estados:** `pending_payment` → `confirmed` → `preparing` → `in_transit` → `delivered`
- Tienda confirma orden (pasa a `preparing`)
- Tienda asigna repartidor disponible
- Repartidor actualiza ubicación en tiempo real via Socket.io
- Cliente recibe eventos de estado y ubicación via Socket.io
- Mapa Leaflet muestra ruta repartidor → dirección del cliente
- Historial de ubicaciones guardado en DB
- Delivery asignado a 1 repartidor por orden

## Acceptance Criteria
- [ ] Dueño de tienda ve órdenes entrantes
- [ ] Dueño puede cambiar estado de orden
- [ ] Dueño puede asignar repartidor
- [ ] Repartidor puede actualizar ubicación
- [ ] Cliente recibe updates en tiempo real via Socket.io
- [ ] Historial de ubicaciones se guarda
- [ ] Mapa muestra posición del repartidor

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos Delivery, DeliveryLocation, OrderStatus a Prisma
- [ ] Implementar cambio de estado con validaciones
- [ ] Integrar Socket.io para eventos en tiempo real
- [ ] Guardar historial de ubicaciones
- [ ] Endpoint de tracking para el cliente
- [ ] PR a main
