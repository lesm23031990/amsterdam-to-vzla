---
title: "Spec 13 — Subscriptions UI"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/stores/plans/list
Returns available subscription plans.

### POST /api/v1/stores/:storeId/subscribe
Subscribe store to a plan.

## Request

### POST /api/v1/stores/:storeId/subscribe
```json
{
  "planId": "string"
}
```

Headers: `Authorization: Bearer <token>` (tienda role)

## Response

### Éxito — 200
```json
{
  "ok": true,
  "data": {
    "subscription": {
      "id": "string",
      "planId": "string",
      "status": "active",
      "expiresAt": "2025-08-01T00:00:00Z"
    }
  }
}
```

### Éxito — GET plans
```json
{
  "ok": true,
  "data": {
    "plans": [
      { "id": "plan-basico", "name": "Básico", "price": 15, "features": ["5 productos", "Soporte email"], "currency": "USD" },
      { "id": "plan-premium", "name": "Premium", "price": 30, "features": ["50 productos", "Soporte prioritario", "Estadísticas"], "currency": "USD" },
      { "id": "plan-ilimitado", "name": "Ilimitado", "price": 60, "features": ["Productos ilimitados", "Soporte 24/7", "Estadísticas avanzadas", "API access"], "currency": "USD" }
    ]
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
- Three plan cards displayed side-by-side: Básico ($15), Premium ($30), Ilimitado ($60)
- Current plan highlighted with "Plan Actual" badge
- Current subscription info shown at top: plan name, expiration date, status
- "Seleccionar" button on non-active plans triggers confirmation modal
- Confirmation modal shows plan details and "Confirmar cambio" / "Cancelar"
- Success toast on successful subscription
- Error feedback on failure (insufficient funds, etc.)
- Loading spinner while fetching plans and during subscription
- Responsive: cards stack vertically on small screens

## Acceptance Criteria
- [ ] Store owner can see all available plans
- [ ] Current plan is highlighted with badge
- [ ] Can switch to different plan
- [ ] Confirmation dialog before changing
- [ ] Shows success/error feedback
- [ ] Responsive design

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Implement rutas
- [ ] Build subscription UI page at `/dashboard/subscriptions`
- [ ] Create PlanCard component with features list
- [ ] Add confirmation modal component
- [ ] Integrate with GET /plans/list and POST /subscribe
- [ ] Add loading and error states
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
