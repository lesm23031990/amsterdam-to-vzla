---
title: "Spec 09 — Rediseño UX Marketing: App centrada en productos y ofertas"
labels: ["spec"]
assignees: []
---

## Objetivo

Rediseñar la experiencia principal para que sea **product-first** en lugar de store-first. El usuario debe ver productos y ofertas desde el landing, como Amazon/ mercado libre. Las tiendas pasan a ser un filtro secundario.

## Principios de diseño

- **Productos primero** — el homepage muestra productos destacados, ofertas y novedades
- **Compra en 3 clics** — ver producto → agregar al carrito → checkout
- **Navegación por categorías** visual (iconos grandes) como primer filtro
- **Búsqueda potente** — busca por nombre de producto, tienda o categoría
- **Tiendas como filtro** — se puede explorar por tienda pero no es el flujo principal
- **Obsesión por conversión** — cada elemento visual impulsa a comprar

## Cambios en el frontend

### Landing page (/) — Nuevo diseño
- Hero con ofertas del día / productos destacados (carrusel automático)
- Grid de productos con foto grande, precio, nombre, botón "Comprar"
- Categorías visuales con emojis
- "Ofertas flash" con temporizador
- Barra de búsqueda prominente
- Sin tiendas visibles en homepage (excepto en detalle de producto)

### Página de producto (/products/[id]) — Mejorada
- Galería de imágenes
- Precio grande y llamativo
- Botón "Agregar al carrito" flotante
- Información de la tienda (nombre, enlace)
- Valoraciones (mock inicial)
- Productos relacionados

### Página de tienda (/stores/[slug]) — Secundaria
- Se mantiene pero es accesible desde el producto
- Header con logo e información de la tienda
- Grid de productos de esa tienda

### Barra de navegación — Simplificada
- Logo + búsqueda + carrito + usuario
- Sin links a tiendas en el nav principal
- Categorías en dropdown o sección aparte

### Checkout — Simplificado
- Flujo en 1 página (no pasos)
- Resumen del carrito, dirección, método de pago
- Confirmación con 1 botón

## Comportamiento
- Productos visibles sin autenticación
- Usuario puede agregar al carrito sin cuenta (se le pide login al checkout)
- Búsqueda busca en productos y tiendas simultáneamente
- Ofertas flash: productos con badge "Oferta" y precio tachado

## Acceptance Criteria
- [ ] Landing muestra productos, no tiendas
- [ ] Búsqueda encuentra productos por nombre
- [ ] Compra en máximo 3 clics desde el landing
- [ ] Diseño visualmente atractivo y orientado a conversión
- [ ] Navegación intuitiva para usuarios no técnicos

---

## Tareas Técnicas
- [ ] Rediseñar landing page como market-place de productos
- [ ] Mejorar página de detalle de producto
- [ ] Simplificar navbar
- [ ] Agregar badge de ofertas a productos
- [ ] Optimizar flujo de compra
- [ ] PR a main
