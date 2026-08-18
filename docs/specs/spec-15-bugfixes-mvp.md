---
title: "Spec 15 — Bugfixes MVP"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/admin/orders
Lista todas las órdenes de la plataforma (solo admin).

### GET /api/v1/admin/users
Lista todos los usuarios con rol, email, nombre, orders count (admin).

### PATCH (fix) assistant endpoint
Asegurar que `data.message` se retorna (alias o renombrar desde `data.reply`).

## Request

### GET /api/v1/admin/orders
Headers: `Authorization: Bearer <token>` (admin)

### GET /api/v1/admin/users
Headers: `Authorization: Bearer <token>` (admin)

## Response

### Éxito — 200 (admin orders)
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
        "role": "cliente",
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
- Dashboard `/admin/orders` debe llamar a `GET /api/v1/admin/orders`
- Muestra todas las órdenes de Amsterdam Frozen Foods (no por tienda)

### Bug 2 — Assistant response
- Backend assistant endpoint debe retornar `data.message` (actualmente `data.reply`)
- Renombrar `reply` a `message` o agregar `message` como alias

### Bug 3 — Admin users page
- Admin users page en `/admin/users` debe llamar a `GET /api/v1/admin/users`
- Tabla con columnas: name, email, role, orders count, created date
- Eliminar `setLoading(false)` prematuro antes de que el fetch complete
- Agregar loading spinner mientras se obtienen datos

### New endpoint rules
- `GET /admin/orders`: requiere admin role, sorted by createdAt desc, includes items y delivery info
- `GET /admin/users`: requiere admin role, retorna todos los usuarios con computed ordersCount

## Acceptance Criteria
- [ ] Admin ve todas las órdenes en dashboard
- [ ] AI assistant responses se muestran correctamente
- [ ] Admin ve lista de usuarios con order counts
- [ ] Todos los bugs confirmados como corregidos

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Crear endpoint `GET /api/v1/admin/orders`
- [ ] Crear endpoint `GET /api/v1/admin/users`
- [ ] Fix assistant response para retornar `data.message`
- [ ] Fix dashboard orders page para usar el endpoint correcto
- [ ] Fix admin users page con API call correcto
- [ ] PR a main
