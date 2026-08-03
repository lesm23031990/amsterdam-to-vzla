---
title: "Spec 15 — Bugfixes MVP"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/stores/:storeId/orders
Returns orders for a specific store (new endpoint).

### GET /api/v1/admin/users
Returns all users with role, email, name, stores count, orders count (new endpoint).

### PATCH (fix) assistant endpoint
Ensure `data.message` is returned (alias or rename from `data.reply`).

## Request

### GET /api/v1/stores/:storeId/orders
Headers: `Authorization: Bearer <token>` (tienda/admin)

### GET /api/v1/admin/users
Headers: `Authorization: Bearer <token>` (admin)

## Response

### Éxito — 200 (store orders)
```json
{
  "ok": true,
  "data": {
    "orders": [
      {
        "id": "string",
        "status": "pending",
        "total": 25.50,
        "createdAt": "2025-07-01T12:00:00Z",
        "items": [
          { "productId": "string", "name": "Producto", "quantity": 2, "price": 12.75 }
        ],
        "delivery": {
          "address": "Calle 123",
          "status": "pending"
        },
        "user": { "id": "string", "name": "Cliente" }
      }
    ]
  }
}
```

### Éxito — 200 (admin users)
```json
{
  "ok": true,
  "data": {
    "users": [
      {
        "id": "string",
        "email": "user@example.com",
        "name": "User Name",
        "role": "tienda",
        "storesCount": 1,
        "ordersCount": 15,
        "createdAt": "2025-01-01T00:00:00Z"
      }
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

### Bug 1 — Dashboard orders
- Dashboard `/dashboard/orders` must call `GET /api/v1/stores/:storeId/orders` instead of non-existent `/delivery/orders`
- Store ID obtained from auth context (authenticated store owner)

### Bug 2 — Assistant response
- Backend assistant endpoint must return `data.message` (currently `data.reply`)
- Either rename `reply` to `message` or add `message` as an alias

### Bug 3 — Admin users page
- Admin users page at `/admin/users` must call `GET /api/v1/admin/users`
- Show table with columns: name, email, role, stores count, orders count, created date
- Remove premature `setLoading(false)` before fetch completes
- Add loading spinner while fetching

### New endpoint rules
- `GET /stores/:storeId/orders`: requires tienda or admin role, sorted by createdAt desc, includes items and delivery info
- `GET /admin/users`: requires admin role, returns all users with computed storesCount and ordersCount

## Acceptance Criteria
- [ ] Store owner sees their incoming orders in dashboard
- [ ] AI assistant responses display correctly
- [ ] Admin sees list of all users with store/order counts
- [ ] All bugs confirmed fixed

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Create `GET /api/v1/stores/:storeId/orders` endpoint
- [ ] Create `GET /api/v1/admin/users` endpoint
- [ ] Fix assistant response to return `data.message`
- [ ] Fix dashboard orders page to use correct endpoint
- [ ] Fix admin users page with proper API call
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
