---
title: "Spec 12 — Delivery Map Tracking"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/delivery/orders/:id/tracking
Returns driver location + order status.

### Socket.io event `location:updated`
Receives real-time driver location updates.

## Request

### GET /api/v1/delivery/orders/:id/tracking
Headers: `Authorization: Bearer <token>`

### Socket.io `location:updated`
```json
{
  "orderId": "string",
  "lat": "number",
  "lng": "number"
}
```

## Response

### Éxito — 200
```json
{
  "ok": true,
  "data": {
    "driverLocation": { "lat": 7.7713, "lng": -72.2218 },
    "status": "in_transit"
  }
}
```

### Error — 404
```json
{
  "ok": false,
  "error": "Delivery not found"
}
```

## Behavior
- Map only renders when order status is "in_transit"
- Default center is Amsterdam Frozen Foods location (San Cristóbal) until driver location is available
- Driver marker auto-centers on each location update
- Re-center button appears when user pans away from driver
- Fallback message "Esperando ubicación del repartidor..." when no coordinates
- Socket.io connection joins order-specific room for live updates
- Custom leaflet icon for driver (motorcycle or person marker)
- Works responsively on mobile viewports

## Acceptance Criteria
- [ ] Map renders on order detail page when order status is "in_transit"
- [ ] Driver marker updates in real-time without page refresh
- [ ] Fallback message shows when no location data
- [ ] Works on mobile (responsive)
- [ ] Re-center button appears when user pans away from driver

---

## Tareas Técnicas
- [ ] Add `leaflet` and `@types/leaflet` to apps/web dependencies
- [ ] Build MapComponent with Leaflet + OpenStreetMap tiles
- [ ] Integrate map into order detail page at `/orders/[id]`
- [ ] Connect to Socket.io room for live location updates
- [ ] Implement re-center button logic
- [ ] Add custom driver marker icon
- [ ] Write tests (TDD)
- [ ] Implement rutas
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
