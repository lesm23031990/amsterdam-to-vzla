---
title: "Spec 14 — FastFood Frontend"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/fastfood/stores/:storeId/menu
Returns menu for a food store with option groups and choices.

### POST /api/v1/fastfood/stores/:storeId/menu
Create a menu item (tienda role).

### PUT /api/v1/fastfood/menu/:itemId
Update a menu item.

### DELETE /api/v1/fastfood/menu/:itemId
Delete a menu item.

### PATCH /api/v1/fastfood/menu/:itemId/toggle
Toggle menu item availability.

## Request

### GET /api/v1/fastfood/stores/:storeId/menu
Headers: `Authorization: Bearer <token>` (optional for public)

### POST /api/v1/fastfood/stores/:storeId/menu
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

Headers: `Authorization: Bearer <token>` (tienda)

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
- Store detail page (`/stores/[slug]`) detects `category === "comida"` and renders menu layout
- Menu item cards show: name, description, base price, prep time badge, image
- Clicking item opens modal/drawer with full details and options
- Option groups rendered as radio group (single) or checkboxes (multi)
- Price modifiers shown inline next to each choice
- Quantity selector with add-to-cart button
- Dashboard menu management at `/dashboard/menu` for food stores only
- Dashboard: list items with toggle availability switch
- Dashboard create/edit form includes dynamic option builder (add/remove groups & choices)
- Preparation time badge visible on store detail page
- Cart addition follows same flow as regular products

## Acceptance Criteria
- [ ] Food stores show menu layout instead of product grid
- [ ] Menu items display with options/choices and price modifiers
- [ ] Can add menu items to cart (same as regular cart flow)
- [ ] Store owner can manage menu items from dashboard
- [ ] Store owner can create options with multiple choices
- [ ] Preparation time displayed

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Implement rutas
- [ ] Create MenuItemCard component
- [ ] Build menu item modal with option selector
- [ ] Build dashboard menu management page
- [ ] Create option builder form component
- [ ] Integrate cart with menu items (customizations as metadata)
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
