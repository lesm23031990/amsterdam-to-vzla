---
title: "Spec 11 — Rediseño Hero Banner: imágenes comerciales profesionales"
labels: ["spec"]
assignees: []
---

## Objetivo

Transformar el hero banner de la homepage en un escaparate visual de alto impacto con imágenes reales de productos, generando deseo de compra inmediato.

## Principios de marketing visual

- **Comida real vende más:** una foto profesional de un plato genera salivación → compra
- **Jerarquía visual:** el producto más atractivo debe ser el más grande
- **Prueba social:** mostrar productos "populares" o "más vendidos" genera confianza
- **Calidad sobre cantidad:** 3-4 imágenes impactantes > 10 imágenes mediocres

## Cambios

### Hero Banner — Nuevo diseño

**Antes:** Tarjetas con emojis y gradientes abstractos
**Después:** Collage de imágenes reales de productos con overlays y etiquetas

**Estructura:**
- Fondo: gradiente oscuro (igual, funciona bien)
- Lado izquierdo: texto (igual)
- Lado derecho: collage de 3 imágenes de productos reales con:
  - Borde redondeado y sombra
  - Etiqueta flotante con nombre y precio
  - Badge "Más vendido" o "Popular" en la imagen principal
  - Efecto hover: leve zoom + brillo
  - Animación de entrada escalonada

### Selección de imágenes (comerciales reales)

Usar imágenes de Unsplash de productos reales que se ven deliciosos/atractivos:

| Producto | Imagen | Por qué funciona |
|----------|--------|-----------------|
| Pizza | Una pizza entera con queso derretido | Comida reconfortante, apetitosa, universal |
| Auriculares | Product shot limpio sobre fondo claro | Tecnología aspiracional, minimalista |
| Bolsa de compras | Bolsa de papel con productos | Representa el concepto "marketplace" |
| Pan/pastelería | Croissant dorado recién horneado | Arte visual, textura, calidez |

### Interacciones
- Hover en imagen: escala 1.05 + sombra más profunda
- Click: navega a producto relacionado o a categoría
- Tooltip/anotación con precio en USD
- Animación de entrada: fade-in-up escalonado (50ms entre cada uno)

## Acceptance Criteria
- [ ] Hero muestra imágenes reales de productos (no emojis)
- [ ] Cada imagen tiene etiqueta con nombre + precio
- [ ] Diseño se ve profesional y comercial
- [ ] Animaciones suaves al cargar
- [ ] Responsive (mobile muestra 1-2 imágenes)

---

## Tareas Técnicas
- [ ] Reemplazar emojis por imágenes Unsplash en hero
- [ ] Agregar etiquetas flotantes con precio
- [ ] Agregar badge "Más vendido" / "Popular"
- [ ] Animaciones de entrada
- [ ] PR a main
