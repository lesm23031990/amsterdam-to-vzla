---
title: "Spec 22 — Detalle de Producto Premium"
labels: ["spec", "high-priority"]
assignees: []
---

## Contexto

La página de detalle de producto actual es básica. Se necesita una experiencia premium tipo Mercado Libre pero adaptada al contexto de Amsterdam Frozen Foods: productos congelados con especificaciones técnicas + comida rápida con personalizaciones.

El sistema de interacción social es unificado: comentarios y preguntas conviven en una sola sección. Los usuarios pueden opinar, preguntar, responder y reaccionar. Los MenuItem (comida rápida) también reciben comentarios pero con enfoque en sabor, presentación y experiencia.

## Endpoints

### GET /api/v1/products/:id
Ya existe. Se amplía con specifications[], commentsCount, averageRating, soldCount.

### GET /api/v1/products/:id/comments
Listar comentarios/preguntas de un producto (unificados).

### POST /api/v1/products/:id/comments
Crear comentario o pregunta (auth required).

### POST /api/v1/products/:id/comments/:commentId/reply
Responder a un comentario (auth required).

### POST /api/v1/products/:id/comments/:commentId/react
Reaccionar a un comentario (like, helpful).

### POST /api/v1/products/:id/comments/:commentId/resolve
Marcar pregunta como resuelta (solo admin).

### GET /api/v1/products/:id/related
Productos relacionados y "comprados juntos".

### POST /api/v1/products/:id/report
Reportar producto.

### POST /api/v1/products/:id/notify-stock
Notificar cuando producto agotado vuelva a tener stock.

### GET /api/v1/menu-items/:id
Ya existe. Se amplía con comments, customization options.

### GET /api/v1/menu-items/:id/options
Ya existe. Retorna opciones y personalizaciones.

### GET /api/v1/menu-items/:id/comments
Mismo endpoint que products pero para MenuItem.

### POST /api/v1/menu-items/:id/comments
Crear comentario sobre MenuItem.

### POST /api/v1/menu-items/:id/comments/:commentId/reply
Responder comentario de MenuItem.

## Request

### POST /api/v1/products/:id/comments
Headers: `Authorization: Bearer <token>`
```json
{
  "type": "question",
  "content": "¿Este producto se puede cocinar en freidora de aire?",
  "parentId": null
}
```

```json
{
  "type": "comment",
  "content": "Excelente calidad, lo compré 3 veces y siempre llega perfecto.",
  "rating": 5,
  "images": ["https://..."],
  "parentId": null
}
```

```json
{
  "type": "reply",
  "content": "Sí, funciona perfecto a 180°C por 12 minutos.",
  "parentId": "uuid-del-comentario-padre"
}
```

### POST /api/v1/products/:id/comments/:commentId/react
Headers: `Authorization: Bearer <token>`
```json
{
  "reaction": "helpful"
}
```

### POST /api/v1/products/:id/report
Headers: `Authorization: Bearer <token>`
```json
{
  "reason": "misleading_info",
  "details": "La descripción dice 1kg pero el producto es de 500g"
}
```

### POST /api/v1/products/:id/notify-stock
Headers: `Authorization: Bearer <token>`
```json
{}
```

## Response

### GET /api/v1/products/:id — 200 (ampliado)
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "Nuggets de Pollo Premium x1kg",
    "description": "Nuggets congelados de pollo premium, elaborados con pechuga de pollo seleccionada...",
    "price": 12.50,
    "priceCop": 52500,
    "currency": "USD",
    "category": "congelados",
    "brand": { "name": "Tiffany Foods", "slug": "tiffany", "logoImage": "https://..." },
    "images": ["https://img1", "https://img2", "https://img3"],
    "stock": 200,
    "isFeatured": true,
    "hasDiscount": true,
    "discountPercent": 15,
    "specifications": [
      { "key": "Peso neto", "value": "1 kg" },
      { "key": "Temperatura de conservación", "value": "-18°C" },
      { "key": "Vencimiento", "value": "12 meses desde fabricación" },
      { "key": "Ingredientes", "value": "Pechuga de pollo (70%), pan rallado, sal, especias" },
      { "key": "Certificaciones", "value": "HACCP, ISO 22000" },
      { "key": "País de origen", "value": "Colombia" }
    ],
    "commentsCount": 14,
    "questionsCount": 5,
    "averageRating": 4.5,
    "soldCount": 156,
    "badges": ["trending", "best-seller"],
    "createdAt": "2026-07-01T00:00:00.000Z"
  }
}
```

### GET /api/v1/products/:id/comments — 200
```json
{
  "ok": true,
  "data": {
    "averageRating": 4.5,
    "totalComments": 14,
    "totalQuestions": 5,
    "distribution": { "5": 10, "4": 3, "3": 1, "2": 0, "1": 0 },
    "comments": [
      {
        "id": "uuid",
        "type": "question",
        "user": { "name": "Carlos M.", "initials": "CM" },
        "content": "¿Este producto se puede cocinar en freidora de aire?",
        "images": [],
        "rating": null,
        "createdAt": "2026-08-10T00:00:00.000Z",
        "resolved": true,
        "reactions": { "helpful": 8 },
        "replies": [
          {
            "id": "uuid",
            "user": { "name": "Admin", "initials": "AD", "isAdmin": true },
            "content": "Sí, funciona perfecto a 180°C por 12 minutos. No necesita aceite.",
            "createdAt": "2026-08-10T00:00:00.000Z",
            "reactions": { "helpful": 12 }
          }
        ]
      },
      {
        "id": "uuid",
        "type": "comment",
        "user": { "name": "María G.", "initials": "MG" },
        "content": "Excelente calidad, lo compré 3 veces y siempre llega bien congelado.",
        "images": ["https://review-img1"],
        "rating": 5,
        "verified": true,
        "createdAt": "2026-08-15T00:00:00.000Z",
        "resolved": null,
        "reactions": { "helpful": 5 },
        "replies": []
      }
    ],
    "pagination": { "page": 1, "perPage": 10, "total": 14 }
  }
}
```

### GET /api/v1/products/:id/related — 200
```json
{
  "ok": true,
  "data": {
    "sameCategory": [
      { "id": "uuid", "name": "Papas Fritas x2kg", "price": 8.50, "images": ["..."], "category": "congelados" }
    ],
    "boughtTogether": [
      { "id": "uuid", "name": "Salsa BBQ 500ml", "price": 3.50, "images": ["..."], "category": "salsas" }
    ]
  }
}
```

## Behavior

### Galería de imágenes
- Múltiples imágenes (hasta 10 por producto)
- Imagen principal grande con zoom al hover (desktop) — lupa que sigue el cursor
- Click en imagen abre lightbox/modal de pantalla completa con navegación
- Thumbnails debajo de la imagen principal (scrollable horizontal en mobile)
- Swipe entre imágenes en mobile
- Indicador "1/5" de posición actual
- Si no hay imágenes, placeholder con ícono de producto
- Soporte WebP y AVIF
- Lazy loading en thumbnails

### Información principal del producto
- Nombre del producto (título grande, h1)
- Marca con link que filtra por esa marca
- Badges sociales dinámicos:
  - `trending`: Más vendido esta semana
  - `best-seller`: Más vendido del mes
  - `new`: Agregado hace menos de 7 días
  - `low-stock`: Quedan 5 o menos
- Rating promedio con estrellas + conteo (ej: "4.5 ★ (14 comentarios)")
- Precio actual grande + precio anterior tachado si tiene descuento
- Badge de descuento (ej: "15% OFF")
- Stock: "Disponible (200 unidades)" o "Agotado" con botón "Avisarme cuando haya"
- Cantidad vendida (ej: "+156 vendidos")
- Selector de cantidad (solo si hay stock, máximo = stock disponible)
- Botones: "Agregar al carrito" (primario) + "Comprar ahora" (secundario)
- Botón de compartir (WhatsApp + copiar link)
- Link discreto "Reportar producto"

### Especificaciones por categoría

Cada categoría muestra campos relevantes. El admin llena estos campos al crear/editar el producto.

**Congelados:**
- Peso neto
- Temperatura de conservación
- Vencimiento
- Ingredientes
- Certificaciones
- País de origen
- Instrucciones de preparación

**Insumos:**
- Presentación (kg, litros, unidades)
- Marca
- Uso recomendado
- Rendimiento estimado
- Ingredientes/composición

**Salsas:**
- Volumen
- Tipo (picante, dulce, BBQ, etc.)
- Ingredientes
- Conservación
- Nivel de picante (1-5 si aplica)

**Panadería:**
- Peso
- Tipo de masa
- Instrucciones de cocción
- Vencimiento
- Ingredientes
- Alérgenos

**Bebidas:**
- Volumen
- Sabor
- Temperatura de servicio
- Alcohol (% si aplica)

**Postres:**
- Peso
- Sabor
- Conservación
- Alérgenos
- Ingredientes

### Comida rápida (MenuItem) — experiencia diferenciada

Los MenuItem (hamburguesas, combos, pizzas, etc.) tienen un detalle adaptado:

**Header:**
- Imagen hero grande (ocupa más espacio que en Product)
- Nombre del plato
- Precio
- Tiempo de preparación visible (ej: "15-20 min")
- Badge de disponibilidad ("Disponible" / "No disponible")

**Contenido del plato:**
- Lista de ingredientes principales
- Descripción del plato
- Nivel de picante (si aplica, con íconos 🌶️)
- Tamaño/porción (individual, familiar, etc.)
- Calorías aproximadas (si disponible)

**Personalización (MenuOptions + MenuChoices):**
- Opciones agrupadas por tipo:
  - `single`: Elegir uno (ej: "Término de la carne: Jugoso, Medio, Bien cocido")
  - `multiple`: Elegir varios (ej: "Toppings extra: Queso +$1, Bacon +$2")
  - `required`: Obligatorio (ej: "Elige tu pan: Clásico, Integral, Sin gluten")
- Cada choice muestra nombre + modificador de precio
- Resumen del pedido con precio actualizado en tiempo real
- Nota especial (campo de texto libre, ej: "Sin cebolla, extra salsa")

**Comentarios en MenuItem:**
- Sí tienen comentarios, pero enfocados en:
  - Sabor y calidad del plato
  - Presentación
  - Experiencia general
  - Recomendaciones
- Sin rating numérico obligatorio — pueden dejar solo comentario
- Opcional: subir foto del plato recibido
- Sin "verified buyer" estricto — cualquier usuario puede comentar
- Admin puede responder comentarios

**Sin especificaciones técnicas** — no tienen peso neto, certificaciones, etc.

### Sistema unificado de comentarios y preguntas

**Tipos de comentario:**
- `question`: Pregunta sobre el producto (precio, disponibilidad, uso, etc.)
- `comment`: Opinión, reseña, experiencia, recomendación
- `reply`: Respuesta a cualquier comentario

**Reglas:**
- Solo usuarios autenticados pueden crear comentarios, preguntas y respuestas
- Máximo 500 caracteres por comentario
- Opcional: subir hasta 3 imágenes en comentarios tipo `comment`
- Rating opcional (1-5 estrellas) en comentarios tipo `comment`
- Admin puede responder cualquier comentario
- Admin puede marcar preguntas como `resolved`
- Los comentarios se pueden reaccionar con "Útil" (helpful)
- Orden: preguntas sin responder primero, luego más recientes
- Filtros: "Todos", "Preguntas", "Comentarios", "Con fotos", "Con rating"
- Un comentario por usuario por producto (pero puede tener replies ilimitados)
- Admin puede ocultar comentarios inapropiados (soft-delete)

**Notificaciones:**
- Al usuario le llega notificación cuando:
  - Responden su pregunta
  - Su comentario recibe una reacción
  - El admin marca su pregunta como resuelta
- Al admin le llega notificación cuando:
  - Hay una nueva pregunta sin responder
  - Un producto recibe un reporte

### Productos relacionados

Dos secciones en la parte inferior:

**"Productos similares"** (misma categoría, misma marca si es posible):
- Hasta 6 productos
- Algoritmo: misma categoría > misma marca > rango de precio similar
- Carrusel horizontal (desktop) / scroll horizontal (mobile)

**"Comprados juntos"** (basado en órdenes reales):
- Hasta 4 productos
- Algoritmo: productos que aparecen frecuentemente en la misma orden que este producto
- Si no hay datos suficientes, mostrar productos de la misma categoría
- Botón "Agregar todo al carrito" (agrega el producto actual + los relacionados)

### Compartir
- Botón principal: compartir por WhatsApp (el más usado en Venezuela)
- Botón secundario: copiar link al portapapeles
- En mobile: Web Share API nativo si está disponible
- El link incluye texto pre-armado: "Mira este producto en Amsterdam Frozen Foods: [nombre] — [precio]"

### Reportar producto
- Modal con motivos predefinidos:
  - `misleading_info`: Información engañosa o incorrecta
  - `wrong_price`: Precio incorrecto
  - `out_of_stock`: Producto agotado hace mucho tiempo
  - `inappropriate`: Contenido inapropiado
  - `other`: Otro (campo de texto obligatorio)
- Máximo 1 reporte por usuario por producto
- Notificación al admin con detalles del reporte
- El usuario recibe confirmación: "Gracias, revisaremos tu reporte"

### Notificación de stock
- Cuando un producto está agotado, mostrar "Avisarme cuando haya stock"
- Usuario se suscribe (un click, sin formulario)
- Cuando el stock se restaura (admin actualiza), notificación automática al usuario
- Un usuario solo se suscribe una vez por producto
- Si el usuario ya compró ese producto antes, no necesita suscribirse

### Badges sociales
- `trending`: Top 5 más vendidos de la semana (se calcula automáticamente)
- `best-seller`: Más vendido del mes
- `new`: Producto creado hace menos de 7 días
- `low-stock`: Stock <= 5 unidades
- Se muestran en la esquina superior de la imagen del producto

### Mobile
- Galería: swipe entre imágenes, pinch-to-zoom, lightbox fullscreen
- Tabs: Descripción | Comentarios | Relacionados
- Sticky bottom bar con precio + botón "Agregar al carrito"
- Comentarios: lista vertical con avatares, replies indentados
- Personalización de MenuItem: bottom sheet con opciones
- Scroll suave entre secciones

## Acceptance Criteria

- [ ] Galería con zoom al hover, lightbox, thumbnails y swipe mobile
- [ ] Placeholder si no hay imágenes
- [ ] Badges sociales dinámicos (trending, best-seller, new, low-stock)
- [ ] Especificaciones dinámicas según categoría del producto
- [ ] MenuItem con imagen hero grande, contenido, personalización y comentarios
- [ ] Sistema unificado de comentarios y preguntas (tipos: question, comment, reply)
- [ ] Rating opcional en comentarios con imágenes
- [ ] Reacciones "Útil" en comentarios
- [ ] Admin puede marcar preguntas como resueltas
- [ ] Filtros de comentarios (todos, preguntas, comentarios, con fotos)
- [ ] Productos similares por categoría/marca
- [ ] "Comprados juntos" basado en órdenes reales
- [ ] Compartir por WhatsApp + copiar link
- [ ] Reportar producto con motivos predefinidos
- [ ] Notificación de stock para productos agotados
- [ ] Mobile: tabs, sticky bottom bar, swipe galería
- [ ] Responsive en todos los breakpoints
- [ ] Skeleton loading states
- [ ] Notificaciones al responder preguntas y reportar

---

## Tareas Técnicas

### Database (Prisma)
- [ ] Crear modelo ProductComment (id, productId, userId, type[question|comment|reply], content, images[], rating, parentId, resolved, reactions[Json], createdAt)
- [ ] Crear modelo ProductReport (id, productId, userId, reason, details, createdAt)
- [ ] Crear modelo StockNotification (id, productId, userId, notified, createdAt)
- [ ] Agregar campo soldCount a Product
- [ ] Agregar campo specifications[Json] a Product (array de {key, value})
- [ ] Agregar campo badges[Json] a Product (array de strings)
- [ ] Crear modelo MenuItemComment (id, menuItemId, userId, content, images[], createdAt)
- [ ] Migration y seed de datos de prueba

### Backend
- [ ] GET /api/v1/products/:id — agregar specifications, commentsCount, averageRating, soldCount, badges
- [ ] GET /api/v1/products/:id/comments — listar comentarios unificados con filtros
- [ ] POST /api/v1/products/:id/comments — crear comentario/pregunta (auth)
- [ ] POST /api/v1/products/:id/comments/:commentId/reply — responder (auth)
- [ ] POST /api/v1/products/:id/comments/:commentId/react — reaccionar (auth)
- [ ] POST /api/v1/products/:id/comments/:commentId/resolve — marcar resuelta (admin)
- [ ] GET /api/v1/products/:id/related — similares + comprados juntos
- [ ] POST /api/v1/products/:id/report — reportar (auth)
- [ ] POST /api/v1/products/:id/notify-stock — suscribir notificación (auth)
- [ ] GET /api/v1/menu-items/:id/comments — listar comentarios de MenuItem
- [ ] POST /api/v1/menu-items/:id/comments — crear comentario MenuItem (auth)
- [ ] POST /api/v1/menu-items/:id/comments/:commentId/reply — responder (auth)
- [ ] Middleware: verificar comprador verificado para rating
- [ ] Middleware: solo admin puede resolver preguntas y ocultar comentarios
- [ ] Servicio de notificaciones: responder pregunta, reporte, stock restaurado
- [ ] Algoritmo "comprados juntos": agrupar por orderId, contar frecuencia

### Frontend Web
- [ ] Página /products/[id] con layout de 2 columnas (info + galería)
- [ ] Componente ImageGallery (zoom, lightbox, thumbnails, swipe)
- [ ] Componente ProductInfo (precio, stock, badges, rating, CTAs)
- [ ] Componente ProductSpecifications (tabla dinámica por categoría)
- [ ] Componente CommentsSection (unificado, filtros, crear, reply, reacciones)
- [ ] Componente RelatedProducts (similares + comprados juntos)
- [ ] Componente ShareButton (WhatsApp + clipboard)
- [ ] Componente ReportModal
- [ ] Componente StockNotificationButton
- [ ] Componente MenuItemDetail (hero, contenido, personalización, comentarios)
- [ ] Componente CustomizationOptions (opciones de MenuItem con precio dinámico)
- [ ] Skeleton loading states
- [ ] Responsive design

### Mobile
- [ ] Pantalla detalle Product con galería swipe + lightbox
- [ ] Pantalla detalle MenuItem con hero + personalización
- [ ] Tabs: Descripción | Comentarios | Relacionados
- [ ] Sticky bottom bar con precio + CTA
- [ ] Bottom sheet para personalización de MenuItem
- [ ] Lista de comentarios con replies indentados
- [ ] Carrusel de productos relacionados

### General
- [ ] Tests para endpoints de comentarios
- [ ] Tests para endpoints de MenuItem comments
- [ ] Tests para verified buyer middleware
- [ ] Tests para algoritmo "comprados juntos"
- [ ] Tests para notificación de stock
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
