---
title: "Spec 07 — Módulo Comida Rápida: menú personalizable y tiempo de prep"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/stores/:id/menu-items
Agregar item al menú de comida rápida (solo tienda con categoría `comida`).

### GET /api/v1/stores/:id/menu-items
Listar menú de una tienda de comida.

### PATCH /api/v1/menu-items/:id
Actualizar item del menú.

### DELETE /api/v1/menu-items/:id
Eliminar item del menú.

### POST /api/v1/menu-items/:id/options
Agregar opciones personalizables (ej: tamaño, ingredientes extras).

### POST /api/v1/orders/:id/preparation-time
Estimación de tiempo de preparación.

## Request

### POST /api/v1/stores/:id/menu-items
Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Hamburguesa Clásica",
  "description": "Carne 200g, queso, lechuga, tomate",
  "basePrice": 8.50,
  "currency": "USD",
  "category": "hamburguesa | pizza | pollo | bebida | postre | otros",
  "image": "https://...",
  "preparationTime": 15,
  "isAvailable": true
}
```

### POST /api/v1/menu-items/:id/options
```json
{
  "name": "Tamaño",
  "type": "single | multiple",
  "required": true,
  "choices": [
    { "name": "Pequeño", "priceModifier": 0 },
    { "name": "Grande", "priceModifier": 2.50 }
  ]
}
```

## Response

### GET /api/v1/stores/:id/menu-items — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "Hamburguesa Clásica",
      "basePrice": 8.50,
      "currency": "USD",
      "preparationTime": 15,
      "isAvailable": true,
      "options": [
        {
          "name": "Tamaño",
          "type": "single",
          "required": true,
          "choices": [
            { "name": "Pequeño", "priceModifier": 0 },
            { "name": "Grande", "priceModifier": 2.50 }
          ]
        }
      ]
    }
  ]
}
```

## Behavior
- Solo tiendas con categoría `comida` pueden usar este módulo
- Items de menú tienen tiempo de preparación en minutos
- Opciones personalizables con modificador de precio
- Al agregar al carrito, cliente selecciona opciones → precio final = basePrice + modifiers
- Tiempo de preparación estimado se muestra al cliente al confirmar orden
- Item no disponible (`isAvailable: false`) no se puede agregar al carrito
- Categorías restringidas a comida rápida

## Acceptance Criteria
- [ ] Tienda de comida puede crear items de menú
- [ ] Tienda puede agregar opciones personalizables a un item
- [ ] Cliente ve opciones disponibles al agregar al carrito
- [ ] Precio final incluye modificadores
- [ ] Tiempo de preparación se muestra al confirmar orden
- [ ] Item no disponible no se puede ordenar

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos MenuItem, MenuOption, MenuChoice a Prisma
- [ ] Validar que tienda sea categoría `comida`
- [ ] Implementar CRUD de menú
- [ ] Integrar opciones con carrito (precio final)
- [ ] Mostrar tiempo de preparación en checkout
- [ ] PR a main
