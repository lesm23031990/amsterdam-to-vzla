---
title: "Spec 13 — Subscriptions UI"
labels: ["spec", "archived"]
assignees: []
status: archived
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

> ✅ Verificado 2026-11-16: no existen modelos `SubscriptionPlan`/`StoreSubscription`, endpoints de planes/suscripciones, página `/dashboard/subscriptions` ni componentes `PlanCard` en el código. La eliminación se cumplió con el pivote a plataforma única (spec-02).

- [x] Eliminar modelos SubscriptionPlan, StoreSubscription de Prisma
- [x] Eliminar endpoints de planes y suscripciones
- [x] Eliminar página `/dashboard/subscriptions` si existe
- [x] Eliminar componentes de PlanCard
- [x] PR a main (spec archivado en `cb91ef1`)
