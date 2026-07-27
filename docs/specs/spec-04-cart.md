---
title: "Spec 04 — Carrito Universal: productos de múltiples tiendas"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/cart/items
Agregar producto al carrito del cliente autenticado.

### GET /api/v1/cart
Obtener carrito actual del cliente.

### PATCH /api/v1/cart/items/:id
Actualizar cantidad de un item.

### DELETE /api/v1/cart/items/:id
Eliminar item del carrito.

### DELETE /api/v1/cart
Vaciar carrito.

## Request

### POST /api/v1/cart/items
Headers: `Authorization: Bearer <token>`
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

### PATCH /api/v1/cart/items/:id
```json
{
  "quantity": 3
}
```

## Response

### GET /api/v1/cart — 200
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "name": "Producto X",
        "price": 25.00,
        "currency": "USD",
        "quantity": 2,
        "subtotal": 50.00,
        "image": "https://...",
        "storeId": "uuid",
        "storeName": "Mi Tienda"
      }
    ],
    "totalItems": 2,
    "subtotal": 50.00,
    "groupedByStore": {
      "store-id-1": {
        "storeName": "Mi Tienda",
        "items": [...],
        "subtotal": 50.00
      }
    }
  }
}
```

## Behavior
- Carrito es por cliente (1 carrito activo por usuario)
- Si el cliente no tiene carrito, se crea al agregar primer item
- Producto debe estar activo y tener stock suficiente
- Al agregar producto ya existente en carrito, se incrementa cantidad
- Cantidad no puede exceder stock disponible
- Precio se congela al agregar al carrito (no cambia si el dueño actualiza precio después)
- Al hacer checkout, el carrito se convierte en orden y se limpia
- Producto eliminado por el dueño se marca como no disponible en carrito

## Acceptance Criteria
- [ ] Cliente puede agregar productos de distintas tiendas al carrito
- [ ] Cliente puede ver su carrito agrupado por tienda
- [ ] Cliente puede actualizar cantidades
- [ ] Cliente puede eliminar items
- [ ] Cliente puede vaciar carrito
- [ ] Stock se valida al agregar
- [ ] Precio se congela en el carrito

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos Cart, CartItem a Prisma
- [ ] Implementar rutas de carrito
- [ ] Agrupar items por tienda en la respuesta
- [ ] Validar stock contra producto actual
- [ ] PR a main
