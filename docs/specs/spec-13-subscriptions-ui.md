---
title: "Spec 13 — Subscriptions UI"
labels: ["spec", "archived"]
assignees: []
---

## ⚠️ ARCHIVADO

Este spec ha sido archivado porque Amsterdam Frozen Foods opera como una **plataforma única** sin multi-tenant ni suscripciones. No hay planes, ni tiendas independientes, ni límites de productos.

Todo el contenido de este spec ha sido reemplazado por **Spec 02 — Plataforma Única: Amsterdam Frozen Foods**.

### Lo que se elimina:
- Modelos SubscriptionPlan, StoreSubscription
- Endpoints de planes y suscripciones
- UI de `/dashboard/subscriptions`
- PlanCard components
- Confirmación de cambio de plan

---

## Tareas Técnicas
- [ ] Eliminar modelos SubscriptionPlan, StoreSubscription de Prisma
- [ ] Eliminar endpoints de planes y suscripciones
- [ ] Eliminar página `/dashboard/subscriptions` si existe
- [ ] Eliminar componentes de PlanCard
- [ ] PR a main
