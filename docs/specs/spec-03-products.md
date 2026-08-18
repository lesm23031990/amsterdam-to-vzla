---
title: "Spec 03 — Catálogo de Productos: CRUD por admin"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/products
Crear producto (solo admin).

### GET /api/v1/products
Listar productos activos. Filtros: `?category=&brand=&q=&minPrice=&maxPrice=`.

### GET /api/v1/products/:id
Ver detalle de producto.

### PATCH /api/v1/products/:id
Actualizar producto (solo admin).

### DELETE /api/v1/products/:id
Eliminar producto (solo admin).

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

### PATCH /api/v1/products/:id
```json
{
  "price": 15.00,
  "stock": 150
}
```

## Response

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

## Behavior
- Solo admin puede crear/editar/eliminar productos
- Producto eliminado es soft-delete (isActive = false)
- Stock no puede ser negativo
- Precio debe ser > 0
- Categorías predefinidas: `congelados`, `insumos`, `bebidas`, `salsas`, `panaderia`, `postres`, `otros`
- `brandId` es opcional — si no tiene marca, se muestra "Amsterdam Frozen Foods"
- Productos visibles sin autenticación
- No se requiere suscripción para crear productos

## Acceptance Criteria
- [ ] Admin puede crear un producto
- [ ] Productos se listan públicos (sin auth)
- [ ] Admin puede editar productos
- [ ] Admin puede eliminar (soft-delete) productos
- [ ] Stock y precio se validan (no negativos)
- [ ] Productos con marca muestran logo de la marca
- [ ] Productos sin marca muestran "Amsterdam Frozen Foods"
- [ ] Filtrar por categoría funciona
- [ ] Filtrar por marca funciona
- [ ] Búsqueda por nombre funciona

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Modelo Product con brandId opcional
- [ ] Implementar rutas CRUD (solo admin para write)
- [ ] Soft-delete en lugar de borrado físico
- [ ] Filtros: category, brand, q, minPrice, maxPrice
- [ ] PR a main
