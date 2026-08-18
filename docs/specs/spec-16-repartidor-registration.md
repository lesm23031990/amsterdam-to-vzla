---
title: "Spec 16 — Gestión de Repartidores y Deliveries"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/admin/deliveries
Lista todos los deliveries activos (solo admin).

### POST /api/v1/admin/deliveries
Crear/assignar delivery a un repartidor (solo admin).

### GET /api/v1/delivery/my-deliveries
Lista deliveries asignados al repartidor autenticado.

### PATCH /api/v1/delivery/:id/location
Actualiza la ubicación del repartidor.

### PATCH /api/v1/delivery/:id/status
Actualiza el estado del delivery.

## Request

### GET /api/v1/delivery/my-deliveries
Headers: `Authorization: Bearer <token>` (repartidor)

### PATCH /api/v1/delivery/:id/location
```json
{
  "lat": 7.7713,
  "lng": -72.2218
}
```
Headers: `Authorization: Bearer <token>` (repartidor)

### PATCH /api/v1/delivery/:id/status
```json
{
  "status": "in_transit"
}
```
Headers: `Authorization: Bearer <token>` (repartidor)

## Response

### Éxito — 200 (my deliveries)
```json
{
  "ok": true,
  "data": {
    "deliveries": [
      {
        "id": "string",
        "orderId": "string",
        "customerName": "Juan Pérez",
        "deliveryAddress": "Calle 123, San Cristóbal",
        "status": "pending",
        "total": 25.50,
        "items": [
          { "name": "Producto", "quantity": 2 }
        ]
      }
    ]
  }
}
```

### Éxito — 200 (status update)
```json
{
  "ok": true,
  "data": {
    "status": "in_transit"
  }
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

### Repartidores
- Los repartidores **NO se registran públicamente**
- Admin crea cuentas de repartidor desde el dashboard `/admin/drivers`
- Un repartidor es un usuario con rol `cliente` + un registro en tabla `Driver` vinculado
- El repartidor se loguea normalmente y ve su dashboard `/driver`

### Driver Dashboard (`/driver`)
- Lista de deliveries asignados al repartidor
- Cada tarjeta muestra: order ID, nombre del cliente, dirección, estado, total
- Botones de estado: "Aceptar", "Recogido", "En camino", "Entregado"
- Transiciones válidas: pending → accepted → picked_up → in_transit → delivered
- Botón de ubicación usa geolocalización del navegador → `PATCH /delivery/:id/location`
- Compartir ubicación solo activo cuando delivery está "in_transit"
- Layout responsive para uso en móvil

### Admin Dashboard (`/admin/drivers`)
- Admin puede crear cuentas de repartidor (nombre, email, phone, documento)
- Admin puede asignar deliveries a repartidores disponibles
- Admin ve lista de repartidores con estado (activo, en delivery, offline)

## Acceptance Criteria
- [ ] Admin puede crear cuentas de repartidor
- [ ] Admin puede asignar deliveries a repartidores
- [ ] Repartidor ve sus deliveries asignados
- [ ] Repartidor puede actualizar estado del delivery
- [ ] Repartidor puede compartir ubicación en vivo
- [ ] Transiciones de estado se validan correctamente

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Crear modelo Driver vinculado a User
- [ ] Crear página `/admin/drivers` para gestión de repartidores
- [ ] Crear página `/driver` para dashboard del repartidor
- [ ] Crear componente DeliveryCard
- [ ] Implementar botones de estado con validación
- [ ] Implementar geolocalización del navegador
- [ ] Endpoint GET /api/v1/delivery/my-deliveries
- [ ] Endpoint POST /api/v1/admin/deliveries
- [ ] PR a main
