# Flujo de base de datos: local + demo (Neon)

Cómo trabajar con una base de datos **local** en tu máquina y actualizar la
**demo en Neon** solo al subir cambios.

## Arquitectura de entornos

| Entorno | Archivo env | Base de datos | Script npm |
|---|---|---|---|
| Desarrollo | `server/.env.development` | Postgres local (Docker) | `npm run dev` |
| Producción / demo | `server/.env.production` | Neon | `npm run db:deploy:demo` |

- `server/prisma.config.ts` carga el `.env` según `NODE_ENV` para la **CLI de Prisma**.
- `server/src/lib/load-env.ts` hace lo mismo en **tiempo de ejecución** (server + seed).
  `dotenv` NO sobreescribe variables ya existentes, así que en Render las del dashboard ganan.

## Requisitos

- Docker Desktop (para el Postgres local)
- Node 24 + npm (monorepo con workspaces)

## Setup la primera vez

```bash
# 1. Dependencias del monorepo
npm install

# 2. Levantar Postgres local (desde la raiz del repo)
docker compose up -d

# 3. Verificar el env local (ya apunta a localhost)
#    server/.env.development ->
#    DATABASE_URL=postgresql://postgres:postgres@localhost:5433/amsterdam_to_vzla?schema=public

# 4. Generar cliente Prisma + baseline de migraciones contra la BD local limpia
npm run db:generate -w server
npm run db:migrate -w server -- --name init

# 5. Poblar datos de prueba en local
npm run db:seed -w server
```

## Dia a dia en local

```bash
docker compose up -d       # si el contenedor no esta corriendo
npm run server             # backend  -> http://localhost:3001
npm run web                # frontend -> http://localhost:3000   (otra terminal)
npm test                   # pruebas contra la BD local
```

Cambios al esquema (agregar modelo/columna en `schema.prisma`):

```bash
npm run db:migrate -w server -- --name descripcion-del-cambio
# crea prisma/migrations/<timestamp>_<nombre>/migration.sql y la aplica en LOCAL
```

Inspeccion visual de la base local: `npm run db:studio -w server`

## Subir cambios a la demo (toca Neon - manual)

```bash
# 1. Sube codigo y migraciones
git push

# 2. Aplica las migraciones nuevas en la demo (NO borra datos)
npm run db:deploy:demo -w server
```

`db:deploy:demo` = `NODE_ENV=production prisma migrate deploy` -> lee `.env.production` (Neon).

### Una sola vez: reconciliar el baseline con la demo

La demo se fue actualizando con `prisma db push` (sin historial de migraciones),
asi que `migrate deploy` intentaria recrear tablas que ya existen. Marca el baseline
como "ya aplicado" sin tocar datos:

```bash
npm run db:resolve:demo -w server <timestamp>_init
# ej: npm run db:resolve:demo -w server 20260901000000_init
```

Tras esto, el ciclo `migrate dev` (local) -> `git push` -> `migrate deploy` (demo)
queda sincronizado y con versionado real.

## Scripts disponibles (server/)

| Script | Que hace | Base |
|---|---|---|
| `db:generate` | Genera cliente Prisma | local |
| `db:migrate` | Crea + aplica migracion (dev) | local |
| `db:seed` | Puebla datos de prueba | local |
| `db:studio` | UI visual de la BD | local |
| `db:deploy:demo` | Aplica migraciones pendientes | Neon demo |
| `db:resolve:demo` | Marca una migracion como aplicada | Neon demo |
| `db:seed:demo` | Puebla datos en la demo | Neon demo |

## Troubleshooting

- **500 en `GET /api/v1/products` y `GET /api/v1/rates`** (consola del navegador muestra
  `500 Internal Server Error`): la base local no responde. Ambos endpoints leen
  `exchange_rates` al inicio del handler, así que si la BD/Docker está caída ambos
  devuelven 500. Verifica `docker ps` y levanta el contenedor con `docker compose up -d`.
- **`ECONNREFUSED localhost:5433`** (puerto de `docker-compose.yml`): Docker Desktop no está
  corriendo o el contenedor está detenido. Abre Docker Desktop, espera a que el engine
  arranque y ejecuta `docker compose up -d`; luego `npx prisma migrate status` desde
  `server/` para confirmar que el esquema está al día.
- **Puerto 5432 ocupado** (tienes Postgres nativo): por eso `docker-compose.yml` mapea
  `"5433:5432"`; `DATABASE_URL` local debe usar `...localhost:5433/...`.
- **Reset total de la base local** (destruye datos locales, NUNCA la demo):
  `docker compose down -v` y vuelve al paso 4 de Setup.
- **El server conecta a Neon en vez de local**: revisa que `NODE_ENV` no sea `production`
  en tu terminal local; `npm run server` lo fuerza a `development`.

## Estado actual del repo

- `server/.env.development` ya apunta a Postgres local en `localhost:5433`.
- `docker-compose.yml` creado en la raiz (mapea `5433:5432` porque el 5432 lo usa un
  Postgres nativo de Windows).
- Migraciones versionadas y aplicadas en local (`20260910054940_init`,
  `20261111000000_add_menu_items_to_cart_and_orders`, `20261116000000_add_drivers`);
  `npx prisma migrate status` reporta "Database schema is up to date!".
