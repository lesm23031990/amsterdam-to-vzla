---
title: "Spec 21 — Catálogo Unificado con Filtros"
labels: ["spec", "high-priority"]
assignees: []
---

## Contexto

Las páginas `/products`, `/offers` y la navegación "Catálogo" deben unificarse en una sola vista con tabs y filtros avanzados tipo MercadoLibre.

## Endpoints

### GET /api/v1/products
Ya existe. Se le agrega soporte para `?orderBy=relevance|price_asc|price_desc|newest|name_asc`.

### GET /api/v1/products/categories
Retorna lista de categorías únicas con conteo de productos.

### GET /api/v1/brands
Ya existe. Se usa para el filtro de marcas.

## Request

### GET /api/v1/products
```
?category=congelados
&brandId=uuid
&q=nuggets
&minPrice=1000
&maxPrice=50000
&currency=COP
&orderBy=price_asc
&page=1
&perPage=24
```

### GET /api/v1/products/categories
Headers: `Authorization: Bearer <token>` (opcional)

## Response

### Éxito — 200 (categories)
```json
{
  "ok": true,
  "data": {
    "categories": [
      { "name": "congelados", "count": 12 },
      { "name": "panaderia", "count": 2 },
      { "name": "salsas", "count": 3 },
      { "name": "insumos", "count": 5 },
      { "name": "postres", "count": 8 }
    ]
  }
}
```

### Éxito — 200 (products con orderBy)
```json
{
  "ok": true,
  "data": [...],
  "pagination": { "page": 1, "perPage": 24, "total": 32, "totalPages": 2 }
}
```

## Behavior

### Vista unificada `/products`
- Una sola página con 3 tabs:
  1. **Todos**: Todos los productos activos mezclados (catálogo completo)
  2. **Productos Destacados**: Solo productos marcados como `isFeatured: true` (productos estrella, novedades, recomendados)
  3. **Ofertas**: Productos con descuento (`hasDiscount: true` y `discountPercent > 0`)
- Cada tab es visualmente distinguible:
  - Destacados: badge dorado/estrella ⭐, fondo sutil diferente
  - Ofertas: badge rojo 🔥, precio anterior tachado, porcentaje de descuento visible

### Sidebar de filtros (estilo MercadoLibre)
- **Categorías**: Lista de categorías con conteo, clic filtra
- **Marca**: Checkboxes con logos de marcas, multi-selección
- **Rango de precio**: Input dual (min/max) o slider, en la moneda seleccionada
- **Ordenar por**: Dropdown con opciones:
  - Relevancia (default)
  - Menor precio
  - Mayor precio
  - Más recientes
  - Nombre A-Z
- **Stock**: Toggle "Solo con stock disponible"
- **Aplicar filtros**: Botón que actualiza la URL con query params
- **Limpiar filtros**: Botón que resetea todo
- Los filtros se reflejan en la URL como query params (compartible)
- Sidebar colapsable en mobile (drawer desde la izquierda)

### Grid de productos
- Responsive: 4 columnas (desktop), 3 (tablet), 2 (mobile), 1 (mobile small)
- Cada card muestra:
  - Imagen (o placeholder)
  - Badge de oferta si aplica
  - Badge de stock bajo si quedan <= 5
  - Nombre del producto
  - Marca (link)
  - Precio formateado en moneda seleccionada
  - Precio anterior tachado si es oferta
  - Botón "Agregar al carrito"
- Skeleton loading mientras carga
- "Cargar más" o infinite scroll

### Comportamiento de tabs
- Tab activo se resalta visualmente
- Tabs: **Todos** | **Productos Destacados** | **Ofertas**
- Cambiar de tab limpia filtros de categoría pero mantiene búsqueda y orden
- URL refleja el tab activo: `/products?tab=destacados`, `/products?tab=ofertas`
- Default: tab "Todos"
- Backend usa `?featured=true` para destacados y `?discount=true` para ofertas

### Mobile
- Sidebar se convierte en drawer/modal desde la izquierda
- Botón "Filtros" flotante o en la parte superior
- Tabs en formato scrollable horizontal
- Grid de 2 columnas

## Acceptance Criteria
- [ ] Página `/products` unifica catálogo con 3 tabs: Todos, Productos Destacados, Ofertas
- [ ] Tab "Todos" muestra todos los productos activos
- [ ] Tab "Productos Destacados" muestra solo `isFeatured: true` con badge ⭐
- [ ] Tab "Ofertas" muestra solo `hasDiscount: true` con badge 🔥, precio tachado, % descuento
- [ ] Sidebar con filtros de categoría, marca, precio, orden, stock
- [ ] Filtros se reflejan en URL (compartible)
- [ ] Responsive: sidebar colapsable en mobile
- [ ] Grid responsive (4/3/2/1 columnas)
- [ ] Skeleton loading
- [ ] Paginación o infinite scroll
- [ ] Precios en moneda seleccionada
- [ ] Badges distinguibles para destacados y ofertas

---

## Tareas Técnicas

### Backend
- [ ] Agregar `isFeatured`, `hasDiscount`, `discountPercent` al schema de Product
- [ ] Agregar `?featured=true` y `?discount=true` a GET /api/v1/products
- [ ] Agregar `?orderBy` a GET /api/v1/products
- [ ] Crear GET /api/v1/products/categories
- [ ] Agregar filtro `?inStock=true` (stock > 0)
- [ ] Soporte multi-brandIds (`?brandIds=id1,id2`)

### Frontend Web
- [ ] Unificar /products, /offers en una sola página con tabs
- [ ] Crear componente ProductFilters (sidebar)
- [ ] Crear componente ProductCard mejorado
- [ ] Crear componente CategoryGrid
- [ ] Implementar filtros en URL (useSearchParams)
- [ ] Responsive: drawer para mobile
- [ ] Skeleton loading states
- [ ] Infinite scroll o paginación

### Mobile
- [ ] Actualizar Home screen con tabs y filtros
- [ ] Implementar drawer de filtros
- [ ] Grid responsive

### General
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
