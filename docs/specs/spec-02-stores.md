---
title: "Spec 02 — Plataforma Única: Amsterdam Frozen Foods"
labels: ["spec"]
assignees: []
---

## Objetivo

Amsterdam Frozen Foods opera como una **única marca/plataforma**. No hay tiendas independientes, ni multi-tenant, ni suscripciones. Todos los usuarios son **clientes** o **admin**. Los proveedores/suplidores se muestran solo como **marca visual** en los productos (logo/nombre), sin acceso ni privilegios especiales.

## Cambio de modelo

| Antes (Multi-tenant) | Ahora (Plataforma única) |
|---|---|
| Cada usuario crea su tienda | Una sola plataforma: Amsterdam Frozen Foods |
| Productos pertenecen a una Store | Productos pertenecen a la plataforma |
| Roles: cliente, tienda, repartidor, admin | Roles: cliente, admin |
| Suscripciones y planes | No hay suscripciones |
| Store CRUD por usuarios | Admin gestiona todo desde dashboard |
| Tienda tiene slug, logo, descripción | Proveedores tienen solo nombre + logo de marca |

## Endpoints

### GET /api/v1/brands
Listar marcas/proveedores disponibles (público). Se usa para filtrar productos por marca.

### GET /api/v1/products
Listar productos activos. Filtros: `?category=&q=&brand=&minPrice=&maxPrice=`.
Se elimina `?storeId=` (no hay tiendas). Se agrega `?brand=`.

### GET /api/v1/products/:id
Ver detalle de producto (público).

### POST /api/v1/products
Crear producto (solo admin).
Se elimina `storeId` del request. El producto pertenece a la plataforma.

### PATCH /api/v1/products/:id
Actualizar producto (solo admin).

### DELETE /api/v1/products/:id
Eliminar producto (solo admin, soft-delete).

### GET /api/v1/brands/:slug/products
Listar productos de una marca específica.

## Request

### POST /api/v1/products
Headers: `Authorization: Bearer <token>` (admin)
```json
{
  "name": "Nuggets de Pollo x1kg",
  "description": "Nuggets congelados premium, listos para freír",
  "price": 12.50,
  "category": "congelados",
  "images": ["https://..."],
  "stock": 200,
  "brandId": "uuid-del-proveedor",
  "isActive": true
}
```

### GET /api/v1/products
```
GET /api/v1/products?category=congelados&brand=tiffany&q=nuggets&minPrice=5&maxPrice=20
```

## Response

### GET /api/v1/brands — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tiffany Foods",
      "slug": "tiffany",
      "logoImage": "https://...",
      "productCount": 15
    },
    {
      "id": "uuid",
      "name": "Frisaba",
      "slug": "frisaba",
      "logoImage": "https://...",
      "productCount": 8
    }
  ]
}
```

### GET /api/v1/products — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "Nuggets de Pollo x1kg",
      "price": 12.50,
      "category": "congelados",
      "images": ["https://..."],
      "stock": 200,
      "isActive": true,
      "brand": { "name": "Tiffany Foods", "slug": "tiffany", "logoImage": "https://..." }
    }
  ],
  "meta": { "total": 50, "page": 1, "perPage": 20 }
}
```

### POST /api/v1/products — 201
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "Nuggets de Pollo x1kg",
    "price": 12.50,
    "category": "congelados",
    "stock": 200,
    "brandId": "uuid",
    "isActive": true,
    "createdAt": "2026-07-27T00:00:00.000Z"
  }
}
```

## Brand (Proveedor/Marca)

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del proveedor/marca |
| `slug` | string | Identificador URL-safe |
| `logoImage` | string | URL del logo de la marca |
| `isActive` | boolean | Si la marca está activa |

Las marcas **NO tienen**:
- Usuarios asociados
- Logins ni credenciales
- Dashboards ni paneles
- Suscripciones
- Permisos de ningún tipo

Una marca es puramente un **campo visual** en los productos. Un producto puede o no tener una marca asignada.

## Behavior
- Todos los productos pertenecen a la plataforma Amsterdam Frozen Foods
- Un producto puede tener una `brandId` opcional (mostrar logo de marca)
- Los productos sin marca se muestran como "Amsterdam Frozen Foods"
- Las marcas se gestionan solo desde el admin dashboard
- No hay suscripciones, planes ni límites de productos
- No hay rol "tienda" — solo `cliente` y `admin`
- El rol "repartidor" se maneja como tipo de usuario especial del admin (no rol JWT)
- Cualquier persona que se registre es automáticamente un `cliente`
- Los productos son visibles sin autenticación

## Acceptance Criteria
- [ ] Cualquier usuario registrado tiene rol `cliente` por defecto
- [ ] Admin puede crear/editar/eliminar productos
- [ ] Admin puede gestionar marcas (crear, editar, eliminar)
- [ ] Productos muestran marca/logo si tienen `brandId`
- [ ] Productos sin marca muestran "Amsterdam Frozen Foods"
- [ ] Filtrar productos por marca funciona
- [ ] No existen endpoints de tienda ni suscripciones
- [ ] No hay rol `tienda` en el sistema
- [ ] Seed incluye marcas de ejemplo y productos iniciales

---

## Tareas Técnicas
- [ ] Eliminar modelo StoreSubscription, SubscriptionPlan
- [ ] Simplificar modelo Store → Brand (sin ownerId, sin categoría)
- [ ] Producto: `storeId` → `brandId` (optional)
- [ ] Eliminar rutas de stores CRUD y suscripciones
- [ ] Crear rutas GET /brands y GET /brands/:slug/products
- [ ] Ajustar rutas de productos (eliminar storeId, agregar brandId)
- [ ] Ajustar rol "tienda" → solo cliente/admin
- [ ] Actualizar seed con marcas y productos
- [ ] Integrar con frontend
- [ ] PR a main
