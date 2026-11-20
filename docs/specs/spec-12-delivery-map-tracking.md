---
title: "Spec 12 — Delivery Map Tracking"
labels: ["spec"]
assignees: []
status: archived
---

> **Archivada:** absorbida por [Spec 06](./spec-06-orders.md). El mapa Leaflet, el tracking
> autenticado por Socket.io y las rutas `/api/v1/delivery/:id/*` se implementaron y verificaron allí.
> Este documento se conserva como referencia del diseño original (evento `location:updated`,
> respuesta `driverLocation`), que no coincide con la implementación final.

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

> **Nota:** el contrato final usa `join:order` + evento `delivery:location` (no `location:updated`
> como describe el diseño original). Ver [Spec 06](./spec-06-orders.md#endpoints).

## Evidencia de implementación (verificada 2026-11-19)

| Afirmación | Web | Mobile |
|---|---|---|
| Mapa solo con `in_transit` | `apps/web/src/app/orders/[id]/page.tsx:222-239` | `apps/mobile/app/orders/[id].tsx:294-297` |
| Centro por defecto San Cristóbal | `apps/web/src/components/OrderMap.tsx:18` | `apps/mobile/src/lib/mapHtml.ts:8` |
| Auto-centrado del marcador | `apps/web/src/components/OrderMap.tsx:104-108` | `apps/mobile/src/lib/mapHtml.ts:128-131` |
| Re-centrar tras paneo (>150 m) | `apps/web/src/components/OrderMap.tsx:21,63-68,138-142` | `apps/mobile/src/components/OrderMap.tsx:19,39,74-78` + `mapHtml.ts:143-147` |
| Fallback sin coordenadas | `apps/web/src/components/OrderMap.tsx:131-136` | `apps/mobile/src/components/OrderMap.tsx:68-72` |
| Room Socket.io del pedido | `apps/web/src/app/orders/[id]/page.tsx:146-148,164-166` | `apps/mobile/app/orders/[id].tsx:106-108` + `apps/mobile/src/lib/socket.ts:43` |
| Servidor emite solo a la room | `server/src/routes/delivery.ts:303,369` + `server/src/lib/socket.ts:51` | (misma API) |
| Icono de repartidor | `apps/web/src/components/OrderMap.tsx:24-37` | `apps/mobile/src/lib/mapHtml.ts:13-19,104-109` |
| Responsive | `apps/web/src/components/OrderMap.module.css:90-95` (240 px ≤ 640 px) | Altura nativa fija de 240 px (`OrderMap.tsx:85`), WebView al 100 % |

Tests: `apps/mobile/__tests__/map-html.test.ts` (6 casos: centro/zooms, HTML Leaflet+OSM,
constantes inyectadas, validación de coordenadas, distancias y mensajes del puente) y
`server/src/__tests__/all.test.ts:879,970-995` (rooms y `delivery:status` no global).

## Acceptance Criteria
- [x] Map renders on order detail page when order status is "in_transit" — `apps/web/src/app/orders/[id]/page.tsx:222-239`, `apps/mobile/app/orders/[id].tsx:294-297`
- [x] Driver marker updates in real-time without page refresh — `socket.on('delivery:location', …)` en `apps/web/src/app/orders/[id]/page.tsx:164` y `apps/mobile/app/orders/[id].tsx:106`; guarda de timestamp en `page.tsx:103-107`
- [x] Fallback message shows when no location data — `apps/web/src/components/OrderMap.tsx:131-136`, `apps/mobile/src/components/OrderMap.tsx:68-72`
- [x] Works on mobile (responsive) — `apps/web/src/components/OrderMap.module.css:90-95` + pantalla nativa `apps/mobile/app/orders/[id].tsx:294-297`
- [x] Re-center button appears when user pans away from driver — `apps/web/src/components/OrderMap.tsx:21,63-68,138-142`, `apps/mobile/src/components/OrderMap.tsx:19,39,74-78`

---

## Tareas Técnicas
- [x] Add `leaflet` and `@types/leaflet` to apps/web dependencies — `apps/web/package.json:12,19`
- [x] Build MapComponent with Leaflet + OpenStreetMap tiles — `apps/web/src/components/OrderMap.tsx:49-57`; mobile `apps/mobile/src/lib/mapHtml.ts:74-153`
- [x] Integrate map into order detail page at `/orders/[id]` — `apps/web/src/app/orders/[id]/page.tsx:14,237`
- [x] Connect to Socket.io room for live location updates — `apps/web/src/app/orders/[id]/page.tsx:146-166`; mobile `apps/mobile/app/orders/[id].tsx:106-108`; servidor `server/src/lib/socket.ts:51`
- [x] Implement re-center button logic — `apps/web/src/components/OrderMap.tsx:63-68,111-118`; mobile `apps/mobile/src/components/OrderMap.tsx:30-45`
- [x] Add custom driver marker icon — `apps/web/src/components/OrderMap.tsx:24-37`; mobile `apps/mobile/src/lib/mapHtml.ts:13-19,104-109`
- [x] Write tests (TDD) — `apps/mobile/__tests__/map-html.test.ts`, `server/src/__tests__/all.test.ts:879,970-995`
- [x] Implement rutas — `server/src/routes/delivery.ts:303,369`
- [x] Integrar con frontend — ver "Evidencia de implementación" (web)
- [x] Integrar con mobile — ver "Evidencia de implementación" (mobile)
- [x] PR a main — absorbida por Spec 06, cuyo PR quedó cerrado con el mapa incluido (`docs/specs/spec-06-orders.md:115-116`)
