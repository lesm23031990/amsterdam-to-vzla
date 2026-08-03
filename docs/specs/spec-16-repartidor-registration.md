---
title: "Spec 16 — Repartidor Registration"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/delivery/my-deliveries
Returns deliveries assigned to the authenticated driver.

### PATCH /api/v1/delivery/:id/location
Updates driver's current location (already exists).

### PATCH /api/v1/delivery/:id/status
Updates delivery status (accepted, picked_up, in_transit, delivered).

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
        "storeName": "Tienda Example",
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
- Register form includes "Repartidor" as a role option alongside "Cliente" and "Dueño de tienda"
- After registration as repartidor, redirect to `/driver` page
- Driver dashboard at `/driver` shows assigned deliveries list
- Each delivery card displays: order ID, store name, delivery address, status, total
- Status update buttons: "Aceptar", "Recogido", "En camino", "Entregado"
- Only allowed transitions: pending→accepted→picked_up→in_transit→delivered
- Location update button uses browser geolocation API and sends to `PATCH /delivery/:id/location`
- Location sharing only active when a delivery is in "in_transit" status
- Responsive layout for mobile use

## Acceptance Criteria
- [ ] New users can register as "repartidor"
- [ ] Repartidor sees their assigned deliveries
- [ ] Repartidor can update delivery status
- [ ] Repartidor can share live location

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Add "Repartidor" option to register form
- [ ] Create driver dashboard page at `/driver`
- [ ] Create DeliveryCard component
- [ ] Implement status update buttons with validation
- [ ] Implement location sharing with browser geolocation
- [ ] Add `GET /api/v1/delivery/my-deliveries` backend endpoint
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
