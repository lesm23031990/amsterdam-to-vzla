---
title: "Spec 10 — Ofertas, descuentos y paginación en homepage"
labels: ["spec"]
assignees: []
---

## Objetivo

Evitar que el homepage sea interminable y generar urgencia de compra con una sección de ofertas destacadas.

## Principios de marketing

- **Escasez:** mostrar pocos productos genera más deseo que una lista infinita
- **Urgencia:** sección "Ofertas" con badges rojos y precio tachado activa el FOMO
- **Curiosidad:** "Ver más productos" invita a explorar sin abrumar
- **Conversión:** ofertas primero, productos regulares después

## Cambios

### Homepage — Nueva estructura (de arriba a abajo)

1. **Hero banner** (igual)
2. **Categorías** (igual)
3. **Ofertas del día** — slider/grid horizontal con productos destacados (price < 8 o marcados como oferta). Máximo 4-6 productos.
4. **Productos destacados** — grid de 8 productos máximo
5. **Botón "Ver todos los productos"** → redirige a /products

### Nueva página /offers

- Muestra TODOS los productos en oferta
- Grid completo con paginación (12 por página)
- Badge "🔥 Oferta" + precio original tachado + badge descuento
- Filtros: categoría, precio min/max
- Título: "🔥 Ofertas del día"
- Meta: generar sensación de oportunidad única

### Paginación

- Homepage: máximo 12 productos visibles
- Botón "Ver más productos" debajo del grid
- En /products y /offers: paginación con "Cargar más" (load more)

### Comportamiento
- Ofertas se determinan por precio < 8 USD (productos económicos/impulso)
- Productos en oferta muestran badge "🔥 Oferta" + precio original tachado
- Porcentaje de descuento visible (30% OFF, 50% OFF)
- Al hacer hover en oferta, efecto de brillo/pulso

## Acceptance Criteria
- [ ] Homepage no muestra más de 12 productos
- [ ] Sección "Ofertas del día" visible en homepage
- [ ] Página /offers con todos los productos en oferta
- [ ] Badge de oferta con descuento visible
- [ ] Botón "Ver más" redirige a lista completa
- [ ] Diseño genera sensación de urgencia

---

## Tareas Técnicas
- [ ] Crear sección de ofertas en homepage
- [ ] Crear página /offers con grid completo
- [ ] Implementar paginación (máx 12 por página)
- [ ] Agregar badge con % de descuento
- [ ] Agregar "Ver más productos" en homepage
- [ ] Crear ruta /products como listado completo
- [ ] PR a main
