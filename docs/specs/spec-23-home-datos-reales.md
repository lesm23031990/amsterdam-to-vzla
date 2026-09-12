---
title: "Spec 23 — Home con Datos Reales (anti-huérfanos)"
labels: ["spec", "high-priority"]
assignees: []
status: in-progress
---

## Contexto

La home (`/`) mostraba productos, pedidos e imágenes **hardcodeados** con IDs ficticios
('1', '5', '8'...) que no existen en la BD real → "productos huérfanos" al navegar al
detalle y un botón "Agregar" decorativo que no tocaba el carrito.

La API demo de Vercel (`/api/v1/[...slug]` + `lib/mock-data.ts`) **se conserva** como
demo, pero debe ser autoconsistente: ninguna referencia (pedidos, comentarios, notificaciones)
puede apuntar a un ID inexistente.

## Endpoints

### GET /api/v1/products
Se consumen con `?featured=true&perPage=3` (bento destacados),
`?perPage=6` (Catálogo Express) y `?discount=true&perPage=4` (Ofertas del Día).

### POST /api/v1/cart/items
Body `{ productId, quantity }`. Requiere sesión. Usado por el botón "Agregar" de la home.

### GET /api/v1/checkout/orders
Mis Pedidos: últimas 3 órdenes del usuario logueado. Sin sesión, el módulo se oculta.

## Behavior

- Toda tarjeta de producto (bento, express, ofertas) navega a `/products/{id}` con el **ID real** del producto.
- Sin imagen → placeholder con gradiente + nombre (nunca una foto de unsplash inventada).
- Botón "Agregar": con sesión hace `POST /cart/items` real y muestra "✓ Agregado" temporal;
  sin sesión redirige a `/login`.
- "Mis Pedidos" solo se renderiza con sesión activa y muestra datos de `/checkout/orders`;
  si no hay pedidos, mensaje vacío honesto ("Aún no tienes pedidos").
- Verificación de integridad de la demo: IDs de `productId` en orders/comments/notifications
  existen en `products`; `userId` existen en `users`; `driverId` existe.
- El precio mostradcada tarjeta usa `displayPrice`/`displayDiscountPrice` del API (respeta moneda).

## Acceptance Criteria
- [x] Home trae destacados/express/ofertas desde la API, sin arrays hardcodeados
- [x] Tarjetas de Catálogo Express y Ofertas son clicables hacia el detalle real
- [x] "Agregar" inserta en el carrito real (o lleva a login si no hay sesión)
- [x] "Mis Pedidos" muestra pedidos reales solo con sesión iniciada
- [x] Ningún producto huérfano: todo ID visible en home existe en la fuente de datos
- [x] Demo API autoconsistente (sin referencias rotas en orders/comments/notifications)
- [ ] Funciona igual contra server real (:3001) y contra demo (Vercel)

## Tareas Técnicas
- [x] Escribir tests (TDD)
- [x] Implementar rutas
- [x] Reescribir `page.tsx`: fetch de 3 secciones + tipos reales + placeholder de imagen
- [x] Tarjetas clicables + botón Agregar con login-gate
- [x] Mis Pedidos con /checkout/orders
- [x] Demo: deduplicar seeds de route.ts usando `initial*` de mock-data y corregir referencias
- [x] Integrar con frontend
- [x] Empty states con `.emptySection` para destacados/express/ofertas
- [x] `display:block` en `productImgWrap`/`offerImgWrap` al convertirlos en `<Link>`
- [x] Alinear botones al fondo (flex column + `margin-top:auto`) y clamp de descripción a 2 líneas
- [x] Fila de precio a prueba de cifras COP largas (nowrap + `flex-shrink:0`)
- [x] `db:seed:home`: asegurar >=3 destacados y 4 ofertas (idempotente)
- [x] Reglas de protección del diseño: `docs/rules.md` + skill `.opencode/skills/prototipo-home`
- [ ] PR a main
