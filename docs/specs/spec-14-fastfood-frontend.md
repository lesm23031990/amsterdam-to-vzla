---
title: "Spec 14 — FastFood Frontend"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/menu-items
Returns menu items with option groups and choices (público).

### POST /api/v1/menu-items
Create a menu item (admin only).

### PUT /api/v1/menu-items/:itemId
Update a menu item (admin only).

### DELETE /api/v1/menu-items/:itemId
Delete a menu item (admin only).

### PATCH /api/v1/menu-items/:itemId/toggle
Toggle menu item availability (admin only).

## Request

### GET /api/v1/menu-items
Headers: `Authorization: Bearer <token>` (opcional, público)

### POST /api/v1/menu-items
```json
{
  "name": "string",
  "description": "string",
  "basePrice": "number",
  "prepTime": "number (minutes)",
  "image": "string (URL)",
  "optionGroups": [
    {
      "name": "Tamaño",
      "type": "single | multi",
      "required": true,
      "choices": [
        { "name": "Pequeño", "priceModifier": 0 },
        { "name": "Grande", "priceModifier": 2.50 }
      ]
    }
  ]
}
```

Headers: `Authorization: Bearer <token>` (admin)

## Response

### Éxito — 200 (menu list)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "string",
        "name": "Pizza Margherita",
        "description": "Clásica italiana",
        "basePrice": 8.99,
        "prepTime": 15,
        "image": "https://...",
        "available": true,
        "optionGroups": [
          {
            "id": "string",
            "name": "Tamaño",
            "type": "single",
            "required": true,
            "choices": [
              { "id": "string", "name": "Personal", "priceModifier": 0 },
              { "id": "string", "name": "Familiar", "priceModifier": 4.00 }
            ]
          }
        ]
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
- Página `/menu` muestra items del menú con layout de comida rápida
- Menu item cards muestran: nombre, descripción, precio base, badge de prep time, imagen
- Click en item abre modal con detalles completos y opciones
- Option groups se renderizan como radio group (single) o checkboxes (multi)
- Price modifiers se muestran inline junto a cada choice
- Selector de cantidad con botón de agregar al carrito
- Admin gestiona menú desde `/admin/menu`
- Admin: lista de items con toggle de disponibilidad
- Admin: formulario de crear/editar con option builder dinámico
- Badge de preparation time visible en la página de menú
- Agregar al carrito sigue el mismo flujo que productos regulares

## Acceptance Criteria
- [ ] Página de menú muestra items con opciones y price modifiers
- [ ] Se pueden agregar items de menú al carrito (mismo flujo que productos)
- [ ] Admin puede gestionar items de menú desde dashboard
- [ ] Admin puede crear opciones con múltiples choices
- [ ] Preparation time visible en la UI

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Crear componente MenuItemCard
- [ ] Build menu item modal con option selector
- [ ] Build página de gestión de menú en admin
- [ ] Crear componente option builder form
- [ ] Integrar carrito con menu items (customizations como metadata)
- [ ] PR a main
