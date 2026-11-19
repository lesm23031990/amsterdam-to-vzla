# Prompt de arranque para nueva sesión

> Copia el bloque de abajo completo (desde "Trabajas en…") y pégalo en la sesión nueva.

---

Trabajas en el monorepo `c:\Projects\amsterdam-to-vzla` (npm workspaces: `server`, `apps/web`, `apps/mobile`). Lee `AGENTS.md` y `docs/rules.md` antes de tocar código.

## Estado verificado (2026-11-18)

- Rama `main` = `origin/main` = `4b43b0e`, árbol limpio.
- `npm test` → 169 tests en verde. `npm run specs` → **371/390 (95%)**.
- Stack: Next.js 14 App Router + TS (web), React Native Expo + TS (mobile), Express + TS + Prisma/PostgreSQL (server), Vitest, Socket.io, Leaflet/OpenStreetMap.
- **No cambies `react`/`react-dom`**: están fijados en `19.2.8` para evitar dos copias que rompían `next build` con `Cannot read properties of null (reading 'useContext')` en `/_global-error`. Ver `docs/DEPLOY.md`.
- `server/src/generated/prisma` está versionado y `.gitattributes` normaliza EOL. Si `prisma generate` ensucia el árbol, no lo commitees a ciegas.
- Convenciones: TypeScript estricto, UI en español / código en inglés, commits con prefijo (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), ramas `feature/`, `fix/`, `chore/`, API REST bajo `/api/v1/`, SDD (spec local → tests → código).

## Estado de las specs

| Spec | status | Tareas | Comentario |
|---|---|---|---|
| spec-01 … spec-11, 14, 15, 16, 17, 18, 21, 23 | done | 100% | Nada que hacer |
| `spec-12-delivery-map-tracking` | archived | 2/16 | 14 checkboxes sin marcar, pero **ya implementado** (ver tarea 1) |
| `spec-13-subscriptions-ui` | archived | 5/5 | Nada que hacer |
| `spec-19-binance-pay-integration` | archived | 2/17 | 15 tareas **reales**: solo existe un mock (ver tarea 3) |
| `spec-20-mobile-app-screens` | in-progress | 22/23 | Bloqueada por credenciales Expo (tarea 4) |
| `spec-22-product-detail` | in-progress | 53/71 | 18 abiertas, 2 obsoletas (tarea 2) |

## Trabajo a ejecutar, en este orden

### 1. Sanear el reporte de specs (30 min, sin código de producto)

**a) `docs/specs/spec-12-delivery-map-tracking.md`** — mantener `status: archived` (así queda excluida del total y no altera el %), pero marcar las 14 tareas abiertas con evidencia, porque el tracking ya está en `main`:

- Mapa en detalle del pedido: `apps/web/src/app/orders/[id]/page.tsx:237` (`<OrderMap driverPos={driverPos} …/>`, import dinámico en `:14`); mobile en `apps/mobile/app/orders/[id].tsx:297`.
- Marcador en vivo sin recargar: `socket.on('delivery:location', …)` en `apps/web/src/app/orders/[id]/page.tsx:164` y `apps/mobile/app/orders/[id].tsx:106`; `applyDriverPos` con guarda de timestamp en `:103-107`.
- Botón re-centrar tras paneo: `apps/web/src/components/OrderMap.tsx:21` (`RECENTER_THRESHOLD_METERS = 150`) y `apps/mobile/src/components/OrderMap.tsx:19,39` (`showRecenter`).
- Fallback sin ubicación: estado `ready`/`panned` en `apps/mobile/src/components/OrderMap.tsx:18,34-39` + tests `apps/mobile/__tests__/map-html.test.ts` (6).
- Responsive: `apps/web/src/components/OrderMap.module.css`.

Verifica cada afirmación antes de tildarla; si algo no se cumple, déjala abierta y anótalo.

**b) `docs/specs/spec-22-product-detail.md`** — **elimina** estas 2 tareas (están obsoletas, el propio spec dice "sin verified buyer estricto"):

- `- [ ] Middleware: verificar comprador verificado para rating (obsoleto: …)`
- `- [ ] Tests para verified buyer middleware (obsoleto junto con el middleware)`

Ajusta cualquier conteo o nota de cierre del spec que las mencione y corre `npm run specs`.

### 2. spec-22 product detail — 17 tareas de código

**Lo que ya existe (no reimplementar):**
- Backend de comentarios de producto: `server/src/routes/products.ts:341` (GET), `:443` (POST), `:502` (reply), `:563` (react), `:605` (resolve), `:646` (report), `:739` (related).
- Backend de comentarios de menú: `server/src/routes/fastfood.ts:161` (GET), `:226` (POST), `:265` (reply).
- Modelos con imágenes: `ProductComment.images` (`server/prisma/schema.prisma:349`) y `MenuItemComment.images` (`:401`), ambos `String[]`.
- Galería web: `apps/web/src/app/products/[id]/page.tsx` → lightbox `:101,296`, zoom `:102,170-178`, thumbnails `:307`, share inline `:181-187`.
- Mobile: `apps/mobile/app/products/[id].tsx` (swipe), `apps/mobile/app/menu/[id].tsx`.

**Lo que falta, en orden TDD (test primero, luego código):**
1. **Subida de imágenes en comentarios.** No hay endpoint de archivos (`server/src/routes/` no tiene `uploads`). Decide y documenta la estrategia (multipart a `server/uploads` vs URL externa), respeta el límite de 3 imágenes del spec, valida tipo/tamaño, y agrega tests.
2. **Filtros de comentarios** (todos / preguntas / comentarios / **con fotos**) en web (producto + modal de menú) y mobile. El endpoint GET debe aceptar el filtro `hasImages`.
3. **Comentarios en MenuItem.** `apps/web/src/components/MenuItemModal.tsx` hoy no muestra comentarios (solo imagen, `:116-121`). Crea el componente `MenuItemDetail` (o extiende el modal) con hero, contenido, personalización y sección de comentarios usando los endpoints ya existentes.
4. **`ShareButton` reutilizable** + **deep link de WhatsApp** (`https://wa.me/?text=<url>`). Extrae la lógica de `apps/web/src/app/products/[id]/page.tsx:181-187` a un componente y agrega WhatsApp + copiar link.
5. **Mobile**: lightbox/zoom en la galería (`app/products/[id].tsx`) y bottom sheet real para personalización (`app/menu/[id].tsx`).
6. **Skeleton loading states** en producto (web y mobile) y en el modal/detalle de menú.
7. **Verificación responsive formal**: 320 / 375 / 768 / 1024 / 1440 px en `products/[id]` y menú; deja evidencia escrita en el spec antes de tildar.
8. **Cierre**: marcar checkboxes con evidencia (archivo:línea), `status: done`, PR a main con prefijo `feat(spec-22):`.

### 3. spec-19 Binance Pay — 15 tareas (la única deuda que rompe ventas)

**Estado real:** en `server/src/routes/checkout.ts:101-104` el cobro es un mock:
```ts
if (paymentMethod === 'binance_pay') {
  const tempId = `temp-${userId}-${Date.now()}`
  orderData.paymentUrl = `https://mock.binance.com/pay/${tempId}`
}
```
El pedido queda en `pending_payment` (`:80`) y nunca se confirma por pago. No hay cliente API, ni webhook, ni verificación de firma, ni UI de QR.

**Plan:**
1. Rama `feature/spec-19-binance-pay` y `status: in-progress` en el spec (desarchivar solo al terminar, para no inflar el progreso a medias).
2. Cliente en `server/src/services/binancePay.ts`: firma HMAC-SHA512 (`nonce` + `timestamp` + `body`, header `BinancePay-Signature`), `createOrder`, `getOrder`, timeouts y tipos estrictos. Credenciales por env (`BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET`, `BINANCE_PAY_BASE_URL`), documentadas en `.env.example`; **nunca** hardcodear ni commitear secretos.
3. `POST /api/v1/checkout/pay/binance` (crear orden de pago) y `POST /api/v1/webhooks/binance-pay` (webhook público, fuera de auth, con verificación de firma, **idempotente** por `merchantTradeNo`, transición `pending_payment → confirmed`, `paymentStatus: paid`, `paymentRef`, notificación al cliente con `createNotification` y evento socket).
4. Quitar el mock de `checkout.ts:101-104` y devolver la URL/QR real.
5. UI: mostrar QR + redirect en checkout web y mobile (`apps/web/src/app/checkout/page.tsx` y su equivalente móvil) y estado "pago confirmado".
6. Tests con mocks del HTTP de Binance (nada de red real): firma correcta, webhook idempotente (2 envíos = 1 transición), firma inválida = 401, orden inexistente = 404. Mantén verde `npm test`.

### 4. spec-20 — bloqueada por credenciales (no la intentes sin ellas)

La única tarea abierta (`App builds and runs on both Android and iOS`) requiere la cuenta Expo del dueño. Preparación ya hecha: `apps/mobile/eas.json` (perfiles `preview` APK / `production` AAB), `scripts/mobile-preflight.mjs` (`npm run mobile:env`, `npm run mobile:check`) y guía completa en `docs/MOBILE-DEVICE-VALIDATION.md`.
Pasos del dueño: `npx -y eas-cli login` → `npx -y eas-cli init` (genera `extra.eas.projectId`, hoy el único FAIL de `npm run mobile:check`) → `eas env:create` con la URL HTTPS del túnel → `eas credentials` (FCM V1 / APNs) → `eas build --profile preview --platform android` → matriz de 8 pruebas → marcar el checkbox.

## Definición de terminado (en cada entrega)

```powershell
npm test                                    # debe seguir verde (hoy 169)
cd server; npx tsc --noEmit; cd ..\..
cd apps\web; npx tsc --noEmit; cd ..\..
cd apps\mobile; npx tsc --noEmit; cd ..\..
npm run build -w apps/web
npm run build -w server
npm run specs
```

- Commits con prefijo y cuerpo corto explicando el porqué; una rama por spec; PR a `main`.
- No dejes checkboxes marcados sin evidencia (archivo:línea o test que lo cubre).
- No introduzcas dependencias nuevas sin justificar (el repo usa CSS Modules y `StyleSheet`, sin librerías de UI).

## Gotchas conocidos

- Dos copias de React rompen `next build` (`/_global-error`, `Cannot read properties of null (reading 'useContext')`). `react`/`react-dom` están fijados en `19.2.8` en la raíz; si tocas dependencias de `apps/web` o `apps/mobile`, corre `npm ls react-dom`, confirma que hay una sola copia y luego `npm run build -w apps/web`.
- `npm test` tiene `pretest` que ejecuta `npm run db:generate`; si ensucia `server/src/generated`, revisa el diff antes de commitear (EOL normalizado por `.gitattributes`).
- `apps/mobile/.env` está gitignoreado y apunta a la IP LAN (`http://192.168.0.100:3001`); un APK release no acepta `http://` (CLEARTEXT). Usa túnel HTTPS o build debug + `adb reverse`.
- El backend local debe escuchar en `:3001` para `npm run mobile:check`; si no, el chequeo de `/api/v1/health` falla (esperado).
- Rutas con corchetes (`app/orders/[id]/page.tsx`) requieren `-LiteralPath` en PowerShell; si no, se interpretan como wildcards y `Select-String` devuelve vacío.

## Orden recomendado

1. Tarea 1 (sanear reporte) → 2 commits `docs(spec-12)` y `docs(spec-22)`.
2. Tarea 2 (spec-22, 17 tareas) en `feature/spec-22-product-detail`.
3. Tarea 3 (Binance Pay) en `feature/spec-19-binance-pay`.
4. Tarea 4 en cuanto el dueño comparta las credenciales Expo.
