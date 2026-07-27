---
title: "Spec 03 — Catálogo de Productos: CRUD por tienda"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/products
Crear producto (solo dueño de tienda con suscripción activa).

### GET /api/v1/products
Listar productos activos. Filtros: `?storeId=&category=&q=&minPrice=&maxPrice=`.

### GET /api/v1/products/:id
Ver detalle de producto.

### PATCH /api/v1/products/:id
Actualizar producto (solo dueño de la tienda).

### DELETE /api/v1/products/:id
Eliminar producto (solo dueño de la tienda).

## Request

### POST /api/v1/products
Headers: `Authorization: Bearer <token>`
```json
{
  "storeId": "uuid-de-la-tienda",
  "name": "Producto X",
  "description": "Descripción del producto",
  "price": 25.00,
  "currency": "USD | Bs | COP",
  "category": "comida | bebida | ropa | electronica | hogar | otros",
  "images": ["https://..."],
  "stock": 100,
  "isActive": true
}
```

### PATCH /api/v1/products/:id
```json
{
  "price": 30.00,
  "stock": 80
}
```

## Response

### POST /api/v1/products — 201
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "storeId": "uuid",
    "name": "Producto X",
    "price": 25.00,
    "currency": "USD",
    "stock": 100,
    "isActive": true,
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

### GET /api/v1/products — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "storeId": "uuid",
      "name": "Producto X",
      "price": 25.00,
      "currency": "USD",
      "images": ["https://..."],
      "store": { "name": "Mi Tienda", "slug": "mi-tienda" }
    }
  ],
  "meta": { "total": 50, "page": 1, "perPage": 20 }
}
```

## Behavior
- Solo dueño de la tienda puede crear/editar/eliminar productos
- Store debe tener suscripción activa para crear productos
- Producto eliminado es soft-delete (isActive = false)
- Stock no puede ser negativo
- Precio debe ser > 0
- Categorías predefinidas (limitadas a la lista)

## Acceptance Criteria
- [ ] Dueño de tienda puede crear un producto
- [ ] Store sin suscripción activa no puede crear productos
- [ ] Productos se listan públicos (sin auth)
- [ ] Dueño puede editar solo sus productos
- [ ] Dueño puede eliminar (soft-delete) solo sus productos
- [ ] Stock y precio se validan (no negativos)

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelo Product a Prisma
- [ ] Validar suscripción activa al crear producto
- [ ] Implementar rutas CRUD
- [ ] Soft-delete en lugar de borrado físico
- [ ] PR a main
