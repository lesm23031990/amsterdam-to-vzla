---
title: "Spec XX — Nombre de la Spec"
labels: ["spec"]
assignees: []
---

## Endpoints

### METHOD /api/v1/ruta
Descripción breve.

### METHOD /api/v1/otra-ruta
Descripción breve.

## Request

### METHOD /api/v1/ruta
```json
{
  "campo1": "tipo/descripción",
  "campo2": "tipo/descripción"
}
```

Headers: `Authorization: Bearer <token>` (si aplica)

## Response

### Éxito — 200 / 201
```json
{
  "ok": true,
  "data": { ... }
}
```

### Error — 4xx
```json
{
  "ok": false,
  "error": "mensaje"
}
```

## Behavior
- Regla de negocio 1
- Regla de negocio 2
- Validaciones importantes
- Casos borde

## Acceptance Criteria
- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Implementar rutas
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
