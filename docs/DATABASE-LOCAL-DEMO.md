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
#    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/amsterdam_to_vzla?schema=public

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

- **`ECONNREFUSED localhost:5432`** -> `docker compose up -d` y `docker ps` para ver el contenedor.
- **Puerto 5432 ocupado** (tienes Postgres nativo): cambia el mapeo en `docker-compose.yml` a `"5433:5432"`
  y actualiza `DATABASE_URL` local a `...localhost:5433/...`.
- **Reset total de la base local** (destruye datos locales, NUNCA la demo):
  `docker compose down -v` y vuelve al paso 4 de Setup.
- **El server conecta a Neon en vez de local**: revisa que `NODE_ENV` no sea `production`
  en tu terminal local; `npm run server` lo fuerza a `development`.

## Estado actual del repo

- `server/.env.development` ya apunta a Postgres local.
- `docker-compose.yml` creado en la raiz.
- Falta ejecutar el re-baseline de migraciones (paso 4 de Setup) porque la unica
  migracion histórica (`20260728064425_init`) esta desincronizada: crea tablas borradas
  (`stores`, `subscription_plans`) y no incluye los modelos nuevos
  (`brands`, `notifications`, `exchange_rates`, `product_comments`, etc.).
