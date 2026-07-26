# Reglas Generales del Proyecto — amsterdamToVzla & asociados

## Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 14 (App Router) + TypeScript |
| Mobile | React Native Expo + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | JWT (jsonwebtoken) |
| Pagos | Binance Pay, Efectivo (COP/Bs/USD), Transferencia |
| Tiempo real | Socket.io |
| Mapas | Leaflet (OpenStreetMap) |
| IA | OpenRouter / Groq (modelos open-source) |
| Tests | Vitest |
| SDD | Plane.so + sync scripts |

## Estructura

```
amsterdam-to-vzla/
├── server/                # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/        # Rutas API
│   │   ├── services/      # Lógica de negocio
│   │   ├── middleware/     # Auth, validación
│   │   ├── models/        # Prisma schema
│   │   └── __tests__/     # Tests
│   └── package.json
├── apps/
│   ├── web/               # Next.js (tienda web + admin)
│   └── mobile/            # React Native Expo (app Android/iOS)
├── packages/
│   └── shared/            # Types, utils compartidos
├── docs/
│   ├── rules.md           # Este archivo
│   └── specs/             # Specs locales (sync con Plane.so)
├── scripts/               # Scripts de utilidad
├── .opencode/             # Config de opencode
├── .env.example
├── AGENTS.md              # Contexto global para IA
├── opencode.json          # MCP + subagentes
├── vitest.config.ts
└── package.json           # Monorepo (npm workspaces)
```

## Workflow SDD (Spec-Driven Development)

1. Escribir spec en Plane.so (Issue con template) o local en `docs/specs/`
2. `npm run plane:pull` — Traer issues de Plane.so como specs locales
3. Crear rama `feature/nombre-de-la-spec`
4. `npm test` — Escribir tests primero (que fallan) y confirmar que fallan
5. Implementar hasta que `npm test` pase
6. `npm run plane:push` — Sincronizar cambios a Plane.so
7. Hacer PR y cerrar el Issue en Plane

## Integración con Plane.so

Requiere variables de entorno (ver `.env.example`):

| Variable | Descripción |
|---|---|
| `PLANE_API_KEY` | Token de API de Plane.so |
| `PLANE_WORKSPACE` | Slug del workspace |
| `PLANE_PROJECT` | ID del proyecto |

Comandos:
- `npm run plane:pull` — Descarga issues abiertos como specs en `docs/specs/`
- `npm run plane:push` — Sube cambios locales a Plane.so
- `npm run plane:status` — Compara estado local vs remoto

## Convenciones de Código

| Aspecto | Regla |
|---|---|
| Ramas | `feature/<nombre>`, `fix/<nombre>`, `chore/<nombre>` |
| Commits | Prefijo tipo: `feat:`, `fix:`, `chore:`, `docs:`, `test:` |
| Backend | TypeScript, ESLint, Prisma para DB |
| Frontend web | Next.js App Router, Server Components por defecto |
| Frontend mobile | Expo Router, React Native |
| API | Prefijo `/api/v1/`, formato `{ ok, data?, error? }` |
| Idioma | Código en inglés, textos de UI en español |

## Definition of Done

- [ ] La spec en Plane está actualizada
- [ ] Los tests automatizados pasan
- [ ] El código está en una rama con PR
- [ ] El servidor arranca sin errores
- [ ] Se cerró el Issue en Plane
