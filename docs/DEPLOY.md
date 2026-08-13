# Guía de Despliegue — amsterdamToVzla & asociados

Despliegue de **producción** usando servicios en **free tier** (costo $0) con configuración preparada para añadir dominio propio más tarde.

## Arquitectura de despliegue

| Pieza | Servicio | Plan | Costo | Notas |
|---|---|---|---|---|
| Base de datos | **Neon** | Free (0.5 GB) | $0 | PostgreSQL serverless con autosuspend |
| API (Express + Prisma + Socket.io) | **Render** | Free Web Service | $0 | Duerme tras 15 min inactividad; primer request tarda ~30s en "despertar" |
| Web (Next.js 16) | **Vercel** | Hobby | $0 | Builds ilimitados enadamente |
| Mobile (Expo) | **EAS** | Free (30 builds/mes Android) | $0 | Fuera del alcance de esta guía |

URLs resultantes:

- API: `https://amsterdam-to-vzla-api.onrender.com/api/v1`
- Web: `https://amsterdam-to-vzla.vercel.app` (o el subdominio que asigne Vercel)

## Prerrequisitos

- Repo en GitHub: `lesm23031990/amsterdam-to-vzla`
- Cuentas creadas en:
  - https://neon.tech ( Neon ya creado ✅ )
  - https://render.com (vincular cuenta GitHub)
  - https://vercel.com (vincular cuenta GitHub)
- Branch `feature/spec-stores` con todos los commits de despliegue pushed.

---

## Paso 1 — Neon (Base de datos) ✅

Ya creado. Lo que necesitas copiar:

1. Entra a https://console.neon.tech → tu proyecto.
2. En **Connection Details**:
   - Branch: `main`
   - Database: `neondb`
   - Role: el usuario por defecto.
   - Marca **"Pooled connection"** ( mejora concurrencia ).
3. Copia el connection string. Debe verse así:
   ```
   postgresql://neondb_owner:xxxxx@ep-plain-mountain-ayt5agcb.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   - **El `?sslmode=require` es obligatorio** para Neon; sin él el backend no conecta.

> Neon free tier suspende la cómputo tras inactividad y la reanuda en la primera query (~1-2s de latencia). Aceptable para MVPs.

---

## Paso 2 — Render (API)

### 2.1 Crear el Web Service desde `render.yaml`

1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Selecciona el repo `amsterdam-to-vzla`.
3. Render detecta `render.yaml` y crea el servicio `amsterdam-to-vzla-api` automáticamente.
4. Antes de crear, **completa las env vars marcadas `sync: false`**:

| Key | Value |
|---|---|
| `DATABASE_URL` | Pega el connection string de Neon (paso 1). |
| `CORS_ORIGIN` | Mientras Vercel no esté desplegado: déjalo vacío o usa `*` temporalmente. Tan pronto tengas la URL de Vercel, **éditalo** y pon esa URL exacta. |

5. `JWT_SECRET` se genera automáticamente (`generateValue: true`).
6. **Create Web Service**. Render hace:
   - `npm install`
   - `npx prisma generate`
   - `npx prisma migrate deploy` ← **aplica las migraciones a Neon** ( crea todas las tablas ).
   - `npm run build` ( compila TypeScript → `dist/` )
   - `npm start`
7. Verifica en la pestaña **Logs** que veas:
   ```
   amsterdam-to-vzla server corriendo en http://localhost:3001
   ```
   Y que el health check pase:
   ```
   https://amsterdam-to-vzla-api.onrender.com/api/v1/health
   → {"ok":true,"name":"amsterdam-to-vzla"}
   ```

> ### Importante: orden del `buildCommand`
> `prisma migrate deploy` debe ir **antes** de `npm run build`, porque la compilación no depende de la DB, pero el runtime sí. Si `migrate deploy` falla, el deploy entero falla — eso es intencional.

### 2.2 Verificar migraciones aplicadas

Desde Neon Console → **Tables**, deberías ver:
`User`, `Store`, `Product`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Delivery`, `DeliveryLocation`, `Conversation`, `Message`, `MenuItem`, `MenuOption`, `MenuChoice`, `StoreSubscription`, `SubscriptionPlan`.

### 2.3 (Opcional) Seed inicial

Si quieres datos de demo (6 tiendas, 62 productos) en producción:

1. Render → tu servicio → **Shell** → Run:
   ```bash
   npx tsx src/seed.ts
   ```
2. Verifica con `GET /api/v1/stores` que devuelva las 6 tiendas.

> No se corre automáticamente porque borraria datos en cada redeploy.

---

## Paso 3 — Vercel (Web)

### 3.1 Importar el proyecto

1. https://vercel.com/new → importa `amsterdam-to-vzla`.
2. En **Configure Project**:
   - **Framework Preset**: Next.js ( autodetectado ).
   - **Root Directory**: `apps/web` ← **importante**, monorepo npm workspaces.
   - **Build Command**: `next build` ( default ).
   - **Output Directory**: `.next` ( default ).
3. En **Environment Variables**, añade:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://amsterdam-to-vzla-api.onrender.com/api/v1` |

4. **Deploy**. El primer build tarda ~1-2 min.

> Vercel detecta automáticamente npm workspaces. Solo instalará las dependencias de `apps/web` y `next` (no las del server ni mobile).

### 3.2 Volver a Render y fijar el CORS

Ahora que Vercel te dio una URL final ( ej: `https://amsterdam-to-vzla.vercel.app` ):

1. Render → tu servicio → **Environment** → edita `CORS_ORIGIN`:
   ```
   https://amsterdam-to-vzla.vercel.app
   ```
2. Para soportar Vercel previews ( URLs como `amsterdam-to-vzla-git-main-usuario.vercel.app` ), separa por comas:
   ```
   https://amsterdam-to-vzla.vercel.app,https://amsterdam-to-vzla-*.vercel.app
   ```
   - El backend soporta lista separada por comas y la pasa a `cors()` de Express.

3. **Save Changes** → Render hace un redeploy automático.

### 3.3 Verificar web

- Abre la URL de Vercel.
- Abre DevTools → Network → confirma que las peticiones a `/api/v1/stores` vuelvan 200, no CORS errors.

---

## Paso 4 — Dominio propio (futuro)

1. **Vercel** (gratis en plan Hobby con dominio comprado aparte):
   - Project Settings → **Domains** → Add → introduce `tudominio.com` o `www.tudominio.com`.
   - Vercel te da los records DNS a añadir en tu registrar ( CNAME, A ).
2. **Render**:
   - Settings → **Custom Domain** → introduce `api.tudominio.com`.
   - Render te da un CNAME a añadir en tu registrar.
3. **Actualizar env vars**:
   - Vercel: `NEXT_PUBLIC_API_URL` → `https://api.tudominio.com/api/v1`
   - Render: `CORS_ORIGIN` → `https://tudominio.com,https://www.tudominio.com`
4. Redeploy ambas piezas.

> Render free tier soporta dominio custom. Vercel Hobby también.

---

## Verificación de salud (health checks)

| Servicio | URL | Respuesta esperada |
|---|---|---|
| API | `https://amsterdam-to-vzla-api.onrender.com/api/v1/health` | `{"ok":true,"name":"amsterdam-to-vzla"}` |
| Web | `https://amsterdam-to-vzla.vercel.app` | Página de inicio ( Next.js ). |
| DB | Neon Console → Tables | 16 tablas migradas. |

---

## Troubleshooting

### `CORS error` en la web al llamar a la API
- Confirma que `CORS_ORIGIN` en Render tenga exactamente tu URL de Vercel (sin barra final, sin path).
- Verifica en `Render → Logs` que el valor cargado sea el correcto (no `*`).

### `prisma migrate deploy` falla en Render con "migration drift"
- Neon ya tiene tablas creadas manualmente o por otro ambiente.
- Solución A: en Neon, marcar la migración init como aplicada:
  ```bash
  # En Render Shell:
  npx prisma migrate resolve --applied 20260728064425_init
  ```
- Solución B: si la DB está vacía y no hay datos que perder, bórrala desde Neon Console y deja que Render aplique de cero.

### API duerme (Render free)
- Tras 15 min sin requests, Render apaga el servicio. El primer request siguiente tarda ~30s en despertarlo.
- Para MVP esto es aceptable. Si necesitas siempre-on, Render "Starter" plan ($7/mes) no duerme.

### `Cannot find module '@prisma/client'`
- Render build no completó el `prisma generate`. Verifica el orden del `buildCommand` en `render.yaml`.

### El health check nunca pasa
- Confirma `process.env.PORT`: Render lo inyecta automáticamente. Si tu `render.yaml` fija `PORT=3001`, Render le hace bind a ese puerto. Mira `server/src/index.ts:41` — usa `process.env.PORT || 3001`.

### Neon: `database "neondb" does not exist`
- Revisa que copiaste el connection string tal cual de Neon Console (Branch + Database correctos).

---

## Comandos útiles

```bash
# Ver logs de la API (live)
render logs amsterdam-to-vzla-api    # requiere render-cli

# Conectar shell a la API en Render
# Render dashboard → tu servicio → Shell → Run command

# Aplicar migraciones manualmente si el build falla
# En Render Shell:
npx prisma migrate deploy

# Resetear DB Neon ( USAR CON CUIDADO )
# Neon Console → Branches → Reset → borrar todos los datos

# Ver env vars cargadas en runtime
# Render → Environment → ver lista
```

---

## Conexión Socket.io (delivery tracking)

Socket.io corre en el mismo puerto que Express ( `server/src/index.ts:18` ). Desde el cliente ( web/mobile ), conectar con:

```ts
import { io } from 'socket.io-client'
const socket = io('https://amsterdam-to-vzla-api.onrender.com', {
  transports: ['websocket'],
})
```

> Render free tier soporta WebSockets. La conexión se cae cuando la API duerme; el cliente debe reconectar ( auto-reconnect habilitado por defecto ).

---

## Estado actual del despliegue

- [x] Neon creado — ✅
- [x] `render.yaml` configurado con `migrate deploy`
- [x] `CORS_ORIGIN` configurable multi-origen (string | array)
- [x] `.env.example` completo y documentado
- [x] `docs/DEPLOY.md` ( este archivo )
- [ ] Render Web Service creado (pendiente ejecución del paso 2)
- [ ] Vercel importado (pendiente ejecución del paso 3)
- [ ] `CORS_ORIGIN` fijado con URL final de Vercel
- [ ] (futuro) Dominio propio configurado