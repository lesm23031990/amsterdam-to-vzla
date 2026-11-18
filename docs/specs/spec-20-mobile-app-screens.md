---
title: "Spec 20 — Mobile App Screens"
labels: ["spec"]
assignees: []
status: in-progress
---

## Endpoints

### All existing backend API endpoints (same as web)
All endpoints at `api/v1/*` are reused by the mobile app.

### POST /api/v1/auth/register
User registration (same as web).

### POST /api/v1/auth/login
User login (same as web).

## Request

### POST /api/v1/auth/login
```json
{
  "email": "user@example.com",
  "password": "********"
}
```

### POST /api/v1/auth/register
```json
{
  "email": "user@example.com",
  "password": "********",
  "name": "User Name",
  "phone": "+584141234567"
}
```

## Response

### Éxito — 200 (login)
```json
{
  "ok": true,
  "data": {
    "token": "jwt-token",
    "user": { "id": "string", "name": "User", "email": "user@example.com", "role": "cliente" }
  }
}
```

## Behavior
- Expo Router for navigation with file-based routing
- Bottom tab navigation: Home, Categories, Cart, Orders, Profile
- Shared API client (axios/fetch) pointing to backend URL from env
- Auth token stored in SecureStore and attached to all requests
- Screens to build:

  1. **Home**: Product grid, search bar, horizontal category chips, brand logos
  2. **Login/Register**: Auth forms (sin role selector), validation, error display
  3. **Brands**: Browse brands/suppliers with logos (replaces Store List)
  4. **Brand Detail**: Products by brand, add to cart (replaces Store Detail)
  5. **Product Detail**: Image carousel, price, brand logo, description, quantity selector, add to cart
  6. **Cart**: Simple item list, quantity controls, total, checkout button
  7. **Checkout**: Address form, payment method selector (Binance, cash, transfer), confirm
  8. **Orders**: List of orders with status badge
  9. **Order Detail**: Status step tracker, delivery map (WebView with Leaflet or react-native-maps)
  10. **Driver View**: Assigned deliveries list, status update buttons, location sharing
  11. **AI Assistant**: Chat interface with message bubbles, text input

- Push notifications via Expo push notifications service
- Map: use WebView for Leaflet map (shared component) or react-native-maps
- Cart state managed globally (React Context or Zustand)
- Dark mode support (follow system preference)
- Error boundaries and loading states on every screen
- Pull-to-refresh on data lists

## Acceptance Criteria
- [ ] App builds and runs on both Android and iOS
- [x] User can register, login, browse products
- [x] User can add to cart and checkout
- [x] User can track delivery on map
- [x] Driver can update location
- [x] Push notifications work

---

## Tareas Técnicas
- [x] Set up Expo project with TypeScript and Expo Router
- [x] Configure bottom tab navigation
- [x] Build shared API client with auth interceptor
- [x] Implement SecureStore token persistence
- [x] Build Home screen
- [x] Build Login/Register screens (no role selector)
- [x] Build Brands list and Brand Detail screens (replaces stores)
- [x] Build Product Detail screen
- [x] Build Cart screen (simple list, no store grouping)
- [x] Build Checkout screen
- [x] Build Orders list and Order Detail screens
- [x] Build Driver view screen
- [x] Build AI Assistant chat screen
- [x] Integrate delivery map (WebView or react-native-maps)
- [x] Set up push notifications (Expo)
- [x] Write tests (TDD)
- [x] PR a main (rama `feature/spec-20-mobile-map-push` integrada en `main`)

## Verificación (2026-11-18)

### Mapa de tracking en vivo
- `apps/mobile/src/components/OrderMap.tsx`: WebView con Leaflet 1.9.4 +
  OpenStreetMap (sin API key de Google), mismo centro (San Cristóbal) y
  comportamiento que `apps/web/src/components/OrderMap.tsx`: auto-centrado
  mientras el usuario no panea, botón «Centrar» al alejarse >150 m y mensaje
  de espera cuando no hay ubicación.
- `apps/mobile/src/lib/mapHtml.ts`: HTML autocontenido (`window.setDriver`,
  `window.recenter`) + validación de coordenadas y parseo de mensajes del
  puente (`ready`, `panned`, `following`, `recenter`).
- `app/orders/[id].tsx`: el detalle del pedido mantiene el polling de 15 s como
  respaldo y se conecta por Socket.io (`join:order` autenticado con JWT) para
  escuchar `delivery:location`, `delivery:status` y `order:status`.
- `apps/mobile/src/lib/socket.ts`: el origen del socket se deriva de
  `EXPO_PUBLIC_API_URL`; sin URL válida el tracking en vivo se desactiva.

### Ubicación del repartidor
- `app/driver.tsx` reemplaza `navigator.geolocation` por `expo-location`
  (`requestForegroundPermissionsAsync` + `watchPositionAsync`), que es lo que
  funciona en React Native; la suscripción se libera al desmontar la pantalla.

### Push notifications (Expo)
- `expo-notifications`, `expo-device`, `expo-constants`, `expo-location` y
  `react-native-webview` agregados a `apps/mobile`.
- `app.json`: plugins `expo-notifications` y `expo-location`, más
  `UIBackgroundModes: ["remote-notification"]` en iOS.
- `apps/mobile/src/lib/notifications.ts`: handler en primer plano, canal Android
  `default`, permisos, token de Expo y registro idempotente contra
  `POST /api/v1/notifications/push-token`; `unregisterPushToken()` borra el
  token en el backend y en SecureStore al cerrar sesión.
- `app/_layout.tsx` registra el dispositivo al iniciar sesión y navega a
  `/orders/[id]` al tocar una notificación (incluida la que abre la app en frío).
- El backend ya enviaba push desde `server/src/services/push.ts` (spec 17) y
  ahora tiene un cliente móvil que registra tokens reales.

### Tests
- `apps/mobile/__tests__/map-html.test.ts` (6), `socket-url.test.ts` (5) y
  `push-helpers.test.ts` (4): 15 tests nuevos.
- `npx tsc --noEmit` en `apps/mobile` y `server`, y `npx vitest run` (169 tests)
  en verde.

### Validaciones ejecutadas (2026-11-18)
- `npx tsc --noEmit` en `server`, `apps/mobile` y `apps/web`: sin errores.
- `npm test`: 9 archivos / 169 tests en verde (incluye los 24 tests nuevos de
  este spec).
- `npm run build -w server`: compila sin errores.
- `npx expo export --platform android` y `--platform ios`: ambos bundles Hermes
  se generan correctamente (valida imports, plugins y código de las pantallas).
- `npx prisma migrate status`: base local al día; migración
  `20261118040556_add_push_tokens` aplicada. Tabla `push_tokens` verificada con
  columnas `id`, `user_id`, `token`, `platform`, `created_at`, `updated_at`.
- Smoke test end-to-end contra el servidor real (puerto 3001):
  - `GET /api/v1/health` → 200.
  - `POST /api/v1/auth/register` → 201 con JWT.
  - `POST /api/v1/notifications/push-token` sin token → 401; con token inválido
    o `platform` no soportada → 400; token Expo válido → 200.
  - Reenvío del mismo token con otra plataforma → 200 con el mismo `id`
    (upsert idempotente, no duplica registros).
  - `DELETE /api/v1/notifications/push-token` → `removed: 1`; segundo intento →
    `removed: 0`.
  - `GET /api/v1/notifications` → 200.
- Nota (resuelta el 2026-11-18): `npm run build -w apps/web` fallaba al
  prerenderizar `/_global-error` (`Cannot read properties of null (reading
  'useContext')`) por dos copias de React en el workspace: `expo` y `prisma`
  (Studio) hoistean `react-dom@19.2.8` en la raíz y `apps/web` fijaba
  `19.2.4`. Se alineó `apps/web` a `react`/`react-dom` `19.2.8`, npm deduplicó
  (sin copia en `apps/web/node_modules`) y el build web vuelve a pasar
  (23 rutas, 0 errores). Ver `docs/DEPLOY.md`.

### Pendiente
- Validar en dispositivo físico (token real de Expo y build EAS). Requiere
  `extra.eas.projectId` en `app.json` (`eas init`); sin él, el registro de push
  se omite con un warning y el resto de la app funciona igual.
- Builds nativos Android/iOS (EAS o `expo run:*`): los bundles JS ya exportan
  para ambas plataformas, pero el build nativo no se ejecutó en este entorno.

