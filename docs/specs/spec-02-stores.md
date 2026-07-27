---
title: "Spec 02 — Gestión de Tiendas: CRUD multi-tenant y suscripciones"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/stores
Crear tienda (solo usuario con rol `tienda`).

### GET /api/v1/stores
Listar tiendas activas (público). Filtros: `?q=nombre&category=comida`.

### GET /api/v1/stores/:slug
Ver detalle de una tienda por slug.

### PATCH /api/v1/stores/:id
Actualizar tienda (solo dueño de la tienda).

### GET /api/v1/stores/mine
Obtener la tienda del dueño autenticado.

### GET /api/v1/plans
Listar planes de suscripción disponibles.

### POST /api/v1/stores/:id/subscribe
Suscribir tienda a un plan.

## Request

### POST /api/v1/stores
Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Mi Tienda",
  "slug": "mi-tienda",
  "description": "Vendemos productos artesanales",
  "phone": "+584141234567",
  "address": "Av. Principal, San Cristóbal",
  "category": "artesania | comida | ropa | electronica | otros",
  "coverImage": "https://...",
  "logoImage": "https://..."
}
```

### PATCH /api/v1/stores/:id
Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Nuevo Nombre",
  "description": "Nueva descripción"
}
```

### POST /api/v1/stores/:id/subscribe
Headers: `Authorization: Bearer <token>`
```json
{
  "planId": "uuid-del-plan"
}
```

## Response

### POST /api/v1/stores — 201
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "Mi Tienda",
    "slug": "mi-tienda",
    "description": "...",
    "phone": "+584141234567",
    "address": "Av. Principal, San Cristóbal",
    "category": "artesania",
    "status": "active",
    "ownerId": "uuid-del-usuario",
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

### GET /api/v1/stores — 200
```json
{
  "ok": true,
  "data": [
    { "id": "uuid", "name": "Mi Tienda", "slug": "mi-tienda", "category": "artesania", "logoImage": "...", "status": "active" }
  ],
  "meta": { "total": 10, "page": 1, "perPage": 20 }
}
```

### GET /api/v1/plans — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "Plan Básico",
      "price": 15.00,
      "currency": "USD",
      "interval": "monthly | yearly",
      "features": ["Hasta 50 productos", "Soporte por email"]
    }
  ]
}
```

### Errores — 400 / 401 / 403
```json
{
  "ok": false,
  "error": "mensaje de error"
}
```

## Behavior
- **Slug** único, autogenerado desde el nombre (slugify), permitir override
- **Status** de tienda: `active` por defecto al crear
- **Dueño** solo puede tener UNA tienda (role `tienda` → 1 store)
- Solo el dueño puede editar su tienda
- **Planes** precargados desde semilla (Básico, Premium, Ilimitado)
- Suscripción activa requerida para ciertas features (API valida al crear producto)
- Al subscribirse, se crea/actualiza `StoreSubscription` con fecha de expiración
- Store sin suscripción activa > 30 días → status `suspended`

## Acceptance Criteria
- [ ] Usuario con rol `tienda` puede crear su tienda
- [ ] Usuario con rol `tienda` solo puede crear UNA tienda
- [ ] Slug se genera automáticamente del nombre
- [ ] Slug duplicado devuelve error 400
- [ ] Tiendas activas son públicas (GET sin auth)
- [ ] Dueño puede actualizar su tienda
- [ ] Otro usuario no puede actualizar tienda ajena (403)
- [ ] Listar planes de suscripción
- [ ] Dueño puede suscribir su tienda a un plan
- [ ] Store sin suscripción activa no puede crear productos

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos Store, SubscriptionPlan, StoreSubscription a Prisma
- [ ] Implementar rutas CRUD de tiendas
- [ ] Implementar rutas de planes y suscripción
- [ ] Seed de planes iniciales
- [ ] Validar que store con suscripción vencida no cree productos
- [ ] Integrar con frontend web
- [ ] Integrar con mobile
- [ ] PR a main
