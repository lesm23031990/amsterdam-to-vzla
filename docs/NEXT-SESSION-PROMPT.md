# Prompt de arranque para nueva sesión

> Copia el bloque de abajo completo (desde "Trabajas en…") y pégalo en la sesión nueva.

---

Trabajas en el monorepo `c:\Projects\amsterdam-to-vzla` (npm workspaces: `server`, `apps/web`, `apps/mobile`). Lee `AGENTS.md` y `docs/rules.md` antes de tocar código.

## Estado verificado (2026-11-19)

- `main` en `67b693a`; PRs #9 (spec-22), #10 (Binance Pay) y #11 (dependencias mobile) mergeados, ramas borradas, árbol limpio.
- `npm test` → **261 tests** en verde (20 archivos). `npm run specs` → **404/405 (100%)**: la única caja abierta es spec-20.
- Stack: Next.js 16 App Router + TS (web), React Native Expo SDK 57 + TS (mobile), Express + TS + Prisma/PostgreSQL (server), Vitest, Socket.io, Leaflet/OpenStreetMap.
- **No cambies `react`/`react-dom`**: `19.2.8` en los tres workspaces. Dos copias rompían `next build` (`Cannot read properties of null (reading 'useContext')` en `/_global-error`) y dan `Invalid hook call` en builds nativos. Ver `docs/DEPLOY.md`.
- `apps/mobile` quedó realineado a SDK 57 (`expo 57.0.33`, `expo-router 57.0.31`, `expo-constants 57.0.24`, `react-native 0.86.3`). `expo.install.exclude` ignora `react` a propósito (PR #11). Antes de tocar deps corre `cd apps/mobile; npx -y expo-doctor@latest` (hoy 19/21; los 2 restantes necesitan red a la API de Expo).
- `server/src/generated/prisma` está versionado y `.gitattributes` normaliza EOL. Si `prisma generate` ensucia el árbol, no lo commitees a ciegas.
- Convenciones: TypeScript estricto, UI en español / código en inglés, commits con prefijo (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), ramas `feature/`, `fix/`, `chore/`, API REST bajo `/api/v1/`, SDD (spec local → tests → código).

## Estado de las specs

| Spec | status | Tareas | Comentario |
|---|---|---|---|
| spec-01 … spec-11, 14, 15, 16, 17, 18, 19, 21, 22, 23 | done | 100% | Nada que hacer |
| `spec-12-delivery-map-tracking` | archived | 16/16 | Implementado; excluida del total |
| `spec-13-subscriptions-ui` | archived | 5/5 | Nada que hacer |
| `spec-20-mobile-app-screens` | in-progress | 22/23 | Única caja abierta: build nativo + credenciales Expo |

## Trabajo a ejecutar, en este orden

### 1. spec-20 — probar en teléfono y cerrar el spec

La única tarea abierta (`App builds and runs on both Android and iOS`) no se cierra por CI:
necesita hardware y la cuenta Expo del dueño.

**Paso A — probar hoy, sin credenciales (Expo Go).**

```powershell
npm run server                 # terminal 1
npm run mobile:env             # terminal 2: detecta IP LAN y escribe apps/mobile/.env
npm run mobile:check           # solo debe fallar projectId
cd apps/mobile; npx expo start # escanear el QR con Expo Go (misma Wi-Fi)
```

Cubre las filas 6, 7 y 8 de la matriz (logout idempotente, tracking en vivo, mapa sin
reposición) y todo el recorrido de compra; sin credenciales Binance,
`/checkout/pay/binance` responde `503 not_configured`. Receta completa en
`docs/MOBILE-DEVICE-VALIDATION.md` (§ Prueba rápida sin credenciales).

**Paso B — push real y build nativo.** `npx -y eas-cli login` → `npx -y eas-cli init`
(genera `extra.eas.projectId`, hoy el único FAIL de `mobile:check`) → `eas env:create` con la
URL HTTPS del túnel → `eas credentials` (FCM V1 / APNs) → `eas build --profile preview
--platform android` → filas 1-5 de la matriz → marcar el checkbox con fecha y dispositivo.
iOS queda pendiente mientras no haya Apple Developer Program (99 USD/año).

### 2. Pendientes del dueño (no bloquean código)

- Binance Pay producción: `BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY` y
  `BINANCE_PAY_PUBLIC_KEY` en Render + registrar
  `https://<api>.onrender.com/api/v1/webhooks/binance` en el panel de Binance + un pago real
  de prueba.
- Firebase: `google-services.json` para push en Android.

### 3. Backlog opcional

- `npm audit` reporta 42 avisos (13 moderate, 26 high, 3 critical) tras el realineo de
  dependencias; revisar sin romper `next build` ni `expo export`.
- spec-12 y spec-13 están archivadas a propósito; no las reactives sin motivo.

## Definición de terminado (en cada entrega)

```powershell
npm test                                    # debe seguir verde (hoy 261)
cd server; npx tsc --noEmit; cd ..\..
cd apps\web; npx tsc --noEmit; cd ..\..
cd apps\mobile; npx tsc --noEmit; cd ..\..
npm run build -w apps/web
npm run build -w server
npm run specs
cd apps\mobile; npx expo export --platform android; npx expo export --platform ios; cd ..\..
```

- Commits con prefijo y cuerpo corto explicando el porqué; una rama por spec; PR a `main`.
- No dejes checkboxes marcados sin evidencia (archivo:línea o test que lo cubre).
- No introduzcas dependencias nuevas sin justificar (el repo usa CSS Modules y `StyleSheet`, sin librerías de UI).

## Gotchas conocidos

- Dos copias de React rompen `next build` y los builds nativos. `react`/`react-dom` están
  fijados en `19.2.8`; si tocas deps corre `npm ls react` (una sola copia), luego
  `npm run build -w apps/web` y `npx expo-doctor` en `apps/mobile`.
- `npm install` a secas falla con `ERESOLVE` si `package-lock.json` quedó con versiones viejas
  de `apps/mobile`: borra `apps/mobile/node_modules` y usa `npm install --force` (así se
  resolvió en PR #11) o `npx expo install --fix` desde `apps/mobile`.
- `npm test` tiene `pretest` que ejecuta `npm run db:generate`; si ensucia
  `server/src/generated`, revisa el diff antes de commitear (EOL normalizado por `.gitattributes`).
- `apps/mobile/.env` está gitignoreado y lo reescribe `npm run mobile:env` con la IP LAN del
  momento (hoy `192.168.0.104`; si cambias de red, vuelve a correrlo). Un APK release no acepta
  `http://` (CLEARTEXT): usa túnel HTTPS o build debug + `adb reverse`.
- El backend local debe escuchar en `:3001` para `npm run mobile:check`; si no, el chequeo de
  `/api/v1/health` falla (esperado).
- Rutas con corchetes (`app/orders/[id]/page.tsx`) requieren `-LiteralPath` en PowerShell; si no,
  se interpretan como wildcards y `Select-String` devuelve vacío.
- Los comandos largos (`expo export`, builds de Next) a veces no reportan fin en este entorno:
  redirige a `tmp-*.log`, lanza con `Start-Process` y consulta el log o la carpeta de salida.

## Orden recomendado

1. ~~Sanear reporte de specs~~ → PR #9 (spec-12 archivada 100%, spec-22 69/69).
2. ~~spec-22 product detail~~ → PR #9 mergeado (`4c6717b`).
3. ~~spec-19 Binance Pay~~ → PR #10 mergeado (`aa30440`).
4. ~~Dependencias mobile SDK 57~~ → PR #11 mergeado (`67b693a`).
5. spec-20: Paso A (Expo Go) hoy; Paso B cuando el dueño dé acceso a Expo/Firebase.
