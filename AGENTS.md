# amsterdamToVzla & asociados

Plataforma de comercio electrónico para venta de productos congelados e insumos de comida rápida en San Cristóbal, Venezuela.

## Actores del sistema

- **Cliente**: Compra productos congelados e insumos de comida rápida. Paga en Bs, USD, transferencia o Binance Pay. Recibe delivery con tracking.
- **Súper admin**: Administra toda la plataforma, productos, tiendas, usuarios y reportes.

## Stack

- Web: Next.js 14 App Router + TypeScript
- Mobile: React Native Expo + TypeScript
- Backend: Express + TypeScript
- DB: PostgreSQL + Prisma ORM
- Auth: JWT con roles (cliente, admin)
- Pagos: Binance Pay, efectivo, transferencia
- Tiempo real: Socket.io (delivery tracking)
- Mapas: Leaflet + OpenStreetMap
- IA: OpenRouter / Groq (DeepSeek, Llama, Mistral - modelos gratuitos)
- Tests: Vitest
- SDD: Plane.so (issues como specs)

## Características clave

- Catálogo de productos: congelados e insumos de comida rápida
- Multi-tenant: cada tienda es independiente
- Carrito universal: el cliente puede agregar productos de distintas tiendas
- Delivery tracking: mapa en vivo del repartidor
- Asistente IA: ayuda al cliente con dudas (cómo comprar, rastrear pedido, etc.)

## Convenciones

- TypeScript estricto en todo el proyecto
- Commits con prefijo: feat:, fix:, chore:, docs:, test:
- Ramas: feature/, fix/, chore/
- API REST con prefijo /api/v1/
- UI en español, código en inglés
- Spec-Driven Development: primero spec en Plane, luego tests, luego código
