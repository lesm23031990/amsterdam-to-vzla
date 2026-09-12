---
title: "Spec 04 — Carrito de Compras"
labels: ["spec"]
assignees: []
status: done
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
        "name": "Nuggets de Pollo x1kg",
        "price": 12.50,
        "quantity": 2,
        "subtotal": 25.00,
        "image": "https://...",
        "brand": { "name": "Tiffany Foods", "logoImage": "https://..." }
      }
    ],
    "totalItems": 2,
    "subtotal": 25.00
  }
}
```

## Behavior
- Carrito es por cliente (1 carrito activo por usuario)
- Si el cliente no tiene carrito, se crea al agregar primer item
- Producto debe estar activo y tener stock suficiente
- Al agregar producto ya existente en carrito, se incrementa cantidad
- Cantidad no puede exceder stock disponible
- Precio se congela al agregar al carrito (no cambia si admin actualiza precio después)
- Al hacer checkout, el carrito se convierte en orden y se limpia
- Producto eliminado por admin se marca como no disponible en carrito
- Sin agrupación por tienda — todos los productos son de Amsterdam Frozen Foods

## Acceptance Criteria
- [x] Cliente puede agregar productos al carrito
- [x] Cliente puede ver su carrito con lista de items
- [x] Cliente puede actualizar cantidades
- [x] Cliente puede eliminar items
- [x] Cliente puede vaciar carrito
- [x] Stock se valida al agregar
- [x] Precio se congela en el carrito
- [x] Producto eliminado se muestra como no disponible

---

## Tareas Técnicas
- [x] Escribir tests (TDD)
- [x] Modelos Cart, CartItem en Prisma
- [x] Implementar rutas de carrito
- [x] Validar stock contra producto actual
- [x] PR a main
