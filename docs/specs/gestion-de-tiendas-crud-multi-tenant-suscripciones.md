# Spec: Gestión de tiendas - CRUD multi-tenant, suscripciones

**Plane Issue:** 4db18f35-93d5-4c63-bb9d-4fc88ed2ac1a
**Prioridad:** Media
**Estado:** backlog

---

## Descripción

CRUD de tiendas multi-tenant con planes de suscripción mensual/anual.
Ver `spec-02-stores.md` para detalle completo de endpoints y behaviors.

## Criterios de aceptación

- [ ] Usuario con rol `tienda` puede crear su tienda (1 por usuario)
- [ ] Slug único, autogenerado del nombre
- [ ] Tiendas activas visibles al público
- [ ] Dueño gestiona su tienda (editar)
- [ ] Planes de suscripción con precio e intervalo
- [ ] Tienda sin suscripción activa no puede crear productos

---

> Sincronizado desde Plane.so el 2026-07-27
