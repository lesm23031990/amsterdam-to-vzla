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

## Workflow SDD (Spec-Driven Development) — modo local

1. Escribir/refinar la spec local en `docs/specs/` (desde `TEMPLATE.md`)
2. Definir secciones `## Acceptance Criteria` y `## Tareas Técnicas` con checkboxes `- [ ]`
3. Crear rama `feature/nombre-de-la-spec`
4. `npm test` — Escribir tests primero (que fallan) y confirmar que fallan
5. Implementar hasta que `npm test` pase
6. Marcar el checkbox `- [x]` **solo** de las tareas con test pasando o verificación manual explícita
7. Actualizar `status:` del frontmatter: `draft` → `in-progress` → `done`
   (regla: `done` solo cuando todos los checkboxes están marcados)
8. Hacer PR a main y marcar "PR a main"

El spec `.md` local es la fuente de verdad del avance. Comandos:

- `npm run specs` — Dashboard de progreso (status + % de checkboxes por spec)
- `npm run specs:check` — Falla (exit 1) si alguna spec activa tiene checkboxes pendientes; útil antes de un commit

### Frontmatter de una spec

```yaml
---
title: "Spec NN — Título"
labels: ["spec"]
assignees: []
status: in-progress   # draft | in-progress | done | archived
---
```

`status: archived` excluye la spec del total del dashboard (ej. spec-13).

## Integración con Plane.so (opcional)

> ⚠️ No se usa en el flujo diario (trabajo individual). Los comandos `plane:*`
> se conservan solo para experimentar con la dinámica de MCPs/issues colaborativos.

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

- [ ] La spec local en `docs/specs/` está actualizada (checkboxes + `status:`)
- [ ] Los tests automatizados pasan (`npm test`)
- [ ] `npm run specs` refleja el avance real
- [ ] El código está en una rama con PR
- [ ] El servidor arranca sin errores
