---
title: "Spec 07 — Módulo Comida Rápida: menú personalizable y tiempo de prep"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/menu-items
Agregar item al menú de comida rápida (solo admin).

### GET /api/v1/menu-items
Listar menú de comida rápida (público).

### PATCH /api/v1/menu-items/:id
Actualizar item del menú (solo admin).

### DELETE /api/v1/menu-items/:id
Eliminar item del menú (solo admin).

### POST /api/v1/menu-items/:id/options
Agregar opciones personalizables (ej: tamaño, ingredientes extras) (solo admin).

## Request

### POST /api/v1/menu-items
Headers: `Authorization: Bearer <token>` (admin)
```json
{
  "name": "Hamburguesa Clásica",
  "description": "Carne 200g, queso, lechuga, tomate",
  "basePrice": 8.50,
  "category": "hamburguesa | pizza | pollo | bebida | postre | otro",
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

### GET /api/v1/menu-items — 200
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "Hamburguesa Clásica",
      "basePrice": 8.50,
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
- Solo admin puede crear/editar/eliminar items de menú
- Items de menú tienen tiempo de preparación en minutos
- Opciones personalizables con modificador de precio
- Al agregar al carrito, cliente selecciona opciones → precio final = basePrice + modifiers
- Tiempo de preparación estimado se muestra al cliente al confirmar orden
- Item no disponible (`isAvailable: false`) no se puede agregar al carrito
- Items de menú pertenecen a Amsterdam Frozen Foods (no multi-tenant)

## Acceptance Criteria
- [ ] Admin puede crear items de menú
- [ ] Admin puede agregar opciones personalizables a un item
- [ ] Cliente ve opciones disponibles al agregar al carrito
- [ ] Precio final incluye modificadores
- [ ] Tiempo de preparación se muestra al confirmar orden
- [ ] Item no disponible no se puede ordenar

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos MenuItem, MenuOption, MenuChoice a Prisma
- [ ] Implementar CRUD de menú (solo admin para write)
- [ ] Integrar opciones con carrito (precio final)
- [ ] Mostrar tiempo de preparación en checkout
- [ ] PR a main
