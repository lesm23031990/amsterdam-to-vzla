# AmsterdamToVzla & Asociados

Plataforma multi-tenant de comercio electrónico para asociación de empresas en San Cristóbal, Venezuela.

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

## Actores

- **Cliente** — Compra productos de múltiples tiendas en un carrito universal
- **Dueño de tienda** — Gestiona su catálogo y pedidos, paga suscripción
- **Repartidor** — Recibe pedidos asignados, tracking en tiempo real
- **Súper admin** — Administra la plataforma, comisiones, reportes

## Estructura

```
amsterdam-to-vzla/
├── server/           # Backend Express + TypeScript
├── apps/
│   ├── web/          # Next.js (tienda web + admin)
│   └── mobile/       # React Native Expo (app Android/iOS)
├── packages/
│   └── shared/       # Types, utils compartidos
├── docs/
│   ├── rules.md
│   └── specs/        # Spec-Driven Development
└── scripts/          # Scripts de utilidad
```

## Desarrollo

```bash
npm install         # Instalar dependencias
npm run server      # Iniciar backend
npm run web         # Iniciar frontend web
npm run test        # Ejecutar tests
```

## SDD (Spec-Driven Development)

1. Escribir spec en `docs/specs/`
2. Crear rama `feature/nombre-de-la-spec`
3. Escribir tests (TDD) — deben fallar
4. Implementar hasta que pasen
5. PR a main
