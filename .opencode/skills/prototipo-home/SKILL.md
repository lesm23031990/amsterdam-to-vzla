---
name: prototipo-home
description: Contrato visual de la home de Amsterdam Frozen Foods (apps/web/src/app/page.tsx + page.module.css). Usar SIEMPRE que se vaya a modificar, refactorizar o "arreglar bugs" en la home, page.module.css, Navbar, o las secciones Hero, Bento Destacados, Catálogo Express, Ofertas del Día, Mis Pedidos, CTA y Footer, para no degradar el diseño prototipado.
---

# Prototipo Home — contrato visual

La home es un diseño prototipado y aprobado. Los datos ahora son reales (API),
pero **el layout es intocable salvo que la usuaria pida explícitamente un rediseño**.
Un bug de datos se arregla en la fuente o con estados vacíos, nunca eliminando UI.

## Anatomía por sección (orden exacto en `page.tsx`)

### 1. Hero (`.heroBanner`)
- Fondo `unsplash 1561758033` + `.heroOverlay` azul marino degradado.
- 20 partículas `.particle` generadas + 7 copos `❄️` en `.floatingIcons`.
- Contenido: badge `❄️ Calidad y frescura…`, título de 2 líneas
  (`.heroTitleLine` blanco + `.heroAccent` naranja), subtítulo, 2 CTAs
  (`.heroCta` sólido naranja → `/products`; `.heroCtaOutline` → `/orders` o `/register`),
  3 trust badges (🚚  💳). 3 orbs de gradiente `.orb1/.orb2/.orb3`.

### 2. Bento — Productos Destacados (`.bentoSection`)
- Header: título + `Ver catálogo →` a `/products?tab=featured`.
- Grid `.bentoGrid` con máximo 3 tarjetas (fetch `featured=true&perPage=3`).
- Cada tarjeta es un `<Link>` a `/products/{id}` con clase compuesta
  `bentoCard + bento1|bento2|bento3` (tamaños asimétricos del bento; al mappear
  usar `bento${(i % 3) + 1}`).
- Imagen `bentoImg` (600×400) con overlay inferior `bentoOverlay`:
  tag `bentoTag` (badge o `-%`), nombre `bentoName`, precio `bentoPrice`.
- Alternancia de variante de placeholder: i par `warm`, impar `light`.

### 3. Split — Catálogo Express + Logística (`.splitSection`)
- Izquierda `.catalogSection`: header "Catálogo Express / Productos listos para
  agregar" + `Ver todo →` a `/products`. Grid `.productGrid` (minmax 200px) con
  6 tarjetas (`perPage=6&orderBy=relevance`).
- Anatomía `.productCard` (flex column): `productImgWrap` (Link, display block,
  aspect 4/3) → `productImg`; `productInfo` (flex 1): `productNameLink`>`productName`,
  `productDesc` (clamp 2 líneas), `productPriceRow` (nowrap, space-between:
  `productPrice` + `productStock`; `margin-top: auto`), `addBtn` naranja full-width.
- Botón: "Agregar" / "✓ Agregado" (2 s) / "Agotado" si `stock === 0`.
  Con sesión → `POST /cart/items`; sin sesión → `/login`.
- Derecha `.logisticsSection`: `DeliveryStatusModule` (SOLO si hay sesión:
  3 pedidos de `/checkout/orders`, `statusPill` con clase del estado en español
  vía `ORDER_LABELS`, enlace al detalle). **Empty state contractual**: bloque
  `.logisticsEmpty` (flex column, centrado, padding 28/20) con icono
  `.logisticsEmptyIcon` 🧾, párrafo "Aún no tienes pedidos. ¡Explora el catálogo
  y haz el primero!" y CTA `.logisticsEmptyCta` "Ver catálogo →" a `/products`.
  Jamás un `<p>` suelto sin padding dentro de `.logisticsCard` (tiene padding 0).
  + `QuickAccessModule` (4 accesos con icono: tracking, horario, pagos, mínimo).

### 4. Ofertas del Día (`.offersSection`)
- Header con 🔥 + `Ver todas →` a `/products?tab=offers`.
- Fetch `discount=true&perPage=4`. Grid `.offersGrid` (minmax 250px).
- `.offerCard` (flex column, borde 2px): `offerImgWrap` (Link, display block,
  aspect 1/1) con `offerImg` + `discountPill` `-{discountPercent}%` arriba-derecha;
  `offerInfo` (flex 1): `offerName`, `offerDesc` (clamp 2),
  `offerPriceRow` (`margin-top: auto`: `offerPrice` naranja grande = precio con
  descuento + `offerOld` tachado = precio original), `offerBtn` "Comprar".

### 5. CTA (`.ctaBanner`) — SIEMPRE VISIBLE (contrato)
- Fondo azul marino con partículas, título blanco centrado, texto gris,
  botón naranja. **No envolver en `{!user && ...}`**: el prototipo exige que la
  sección exista siempre; lo único que cambia con sesión es el copy:
  - Sin sesión: "Regístrate y accede a ofertas exclusivas…" + botón
    `Crear cuenta →` a `/register`.
  - Con sesión: "Aprovecha las ofertas del día…" + botón `Ver catálogo →` a `/products`.

### 6. Footer (`.footer`)
- Marca + tagline a la izquierda; 4 enlaces (Catálogo, Marcas, Pedidos, Contacto).

## Reglas de mantenimiento

1. **`<Link>` que envuelve layout ⇒ `display: block` (o flex) en su clase CSS.**
   Los `<a>` son inline por defecto: `width`, `height`, `aspect-ratio` y
   `overflow` no aplican y la imagen rompe la tarjeta.
2. **Tarjetas de la misma fila se alinean por fondo** con
   `.productCard/.offerCard { display:flex; flex-direction:column }` +
   `.productInfo/.offerInfo { flex:1 }` + precio con `margin-top:auto`.
   Quitar cualquiera de las tres desalinea los botones.
3. **Estados vacíos obligatorios**: toda sección data-driven renderiza
   `.emptySection` (dashed, icono, mensaje honesto en `grid-column: 1/-1`)
   cuando `!loading && list.length === 0`. Nunca condicionar el `<section>` completo.
4. **Monedas largas**: `white-space: nowrap` + ellipsis en precio;
   `flex-shrink: 0` en `productStock`. Nunca permitir wrap "COP $21.000" en 2 líneas.
5. **Imágenes**: `product.images[0]` real con `onError` → `makeFoodImg` (SVG
   gradiente + 🧊). Nunca URLs de mostra inventadas.
6. **Skelletons**: mientras `loading`, mantener el grid ocupado con
   `SkeletonCard` (bento 3, express 6, ofertas 4) para que la página no salte.
7. El fetch de home usa `api` (`@/lib/api`) con `currency` de `useCurrency()`
   en la query — nunca `fetch('/api/v1/...')` crudo (rompe NEXT_PUBLIC_API_URL).

## Verificación post-cambio (checklist)

```bash
npx tsc --noEmit               # desde apps/web
npm run build -w apps/web      # desde la raíz
```
- [ ] Las 6 secciones presentes y en orden
- [ ] Tarjetas: imagen con aspect correcto, botón alineado al fondo en TODAS
- [ ] Clic en tarjeta → `/products/{id}` del producto mostrado (UUID real)
- [ ] Agregar sin sesión → /login; con sesión → item en `/cart`
- [ ] Provocar vacío (desmarcar descuentos en admin) → aparece `.emptySection`, no desaparece la sección

## Semilla de datos de home

`npm run db:seed:home -w server` — asegura ≥3 destacados y 4 ofertas (25-36 %)
en la BD de desarrollo; es idempotente.
