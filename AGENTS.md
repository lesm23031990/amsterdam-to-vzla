# amsterdamToVzla & asociados

Plataforma multi-tenant de comercio electrónico para asociación de empresas en San Cristóbal, Venezuela.

## Actores del sistema

- **Cliente**: Compra productos de múltiples tiendas en un carrito universal. Paga en Bs, COP, USD, transferencia o Binance Pay. Recibe delivery con tracking en mapa.
- **Dueño de tienda**: Se registra solo, paga suscripción mensual, gestiona su catálogo y pedidos entrantes.
- **Repartidor**: Recibe pedidos asignados, actualiza estado y ubicación en tiempo real.
- **Súper admin**: Administra toda la plataforma, comisiones, reportes, usuarios.

## Stack

- Web: Next.js 14 App Router + TypeScript
- Mobile: React Native Expo + TypeScript
- Backend: Express + TypeScript
- DB: PostgreSQL + Prisma ORM
- Auth: JWT con roles (cliente, tienda, repartidor, admin)
- Pagos: Binance Pay, efectivo, transferencia
- Tiempo real: Socket.io (delivery tracking)
- Mapas: Leaflet + OpenStreetMap
- IA: OpenRouter / Groq (DeepSeek, Llama, Mistral - modelos gratuitos)
- Tests: Vitest
- SDD: Plane.so (issues como specs)

## Características clave

- Carrito universal: el cliente puede agregar productos de distintas tiendas a un solo carrito
- Multi-tenant: cada tienda es independiente (dueño gestiona su inventario)
- Suscripciones: los dueños de tienda pagan plan mensual/anual
- Delivery tracking: mapa en vivo del repartidor
- Asistente IA: ayuda al cliente con dudas (cómo comprar, rastrear pedido, etc.)
- Comida rápida: módulo con menú personalizable y tiempo de preparación

## Convenciones

- TypeScript estricto en todo el proyecto
- Commits con prefijo: feat:, fix:, chore:, docs:, test:
- Ramas: feature/, fix/, chore/
- API REST con prefijo /api/v1/
- UI en español, código en inglés
- Spec-Driven Development: primero spec en Plane, luego tests, luego código
