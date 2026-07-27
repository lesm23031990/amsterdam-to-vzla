---
title: "Spec 08 — Asistente IA: chatbot para clientes"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/assistant/chat
Enviar mensaje al asistente IA y obtener respuesta.

### GET /api/v1/assistant/conversations
Listar conversaciones del cliente.

### GET /api/v1/assistant/conversations/:id
Ver historial de una conversación.

### DELETE /api/v1/assistant/conversations/:id
Eliminar conversación.

## Request

### POST /api/v1/assistant/chat
Headers: `Authorization: Bearer <token>`
```json
{
  "conversationId": "uuid (opcional, null = nueva conversación)",
  "message": "¿Cómo puedo rastrear mi pedido?"
}
```

## Response

### POST /api/v1/assistant/chat — 200
```json
{
  "ok": true,
  "data": {
    "conversationId": "uuid",
    "reply": "Puedes rastrear tu pedido en tiempo real desde la sección 'Mis Órdenes'. Allí verás un mapa con la ubicación del repartidor.",
    "suggestedActions": [
      { "label": "Ver mis órdenes", "action": "navigate:/orders" },
      { "label": "Hablar con soporte", "action": "contact:support" }
    ],
    "context": {
      "orderId": "uuid-opcional-si-pregunta-por-orden"
    }
  }
}
```

### GET /api/v1/assistant/conversations/:id — 200
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "messages": [
      { "role": "user | assistant", "content": "mensaje", "createdAt": "..." }
    ],
    "createdAt": "..."
  }
}
```

## Behavior
- Asistente responde preguntas sobre cómo usar la plataforma
- Puede consultar estado de órdenes del cliente (autenticado)
- Puede recomendar productos/búsquedas
- No realiza acciones transaccionales (solo informativo)
- Usa OpenRouter/Groq como backend de IA (modelos gratuitos: DeepSeek, Llama, Mistral)
- Respuestas incluyen suggestedActions para navegación rápida
- Conversaciones se guardan para contexto (historial por cliente)
- Rate limit: 30 mensajes por hora por usuario

## Acceptance Criteria
- [ ] Cliente puede enviar mensaje y recibir respuesta
- [ ] Asistente puede consultar estado de órdenes del cliente
- [ ] Asistente recomienda acciones sugeridas
- [ ] Conversaciones se guardan con historial
- [ ] Rate limit funciona correctamente
- [ ] Cliente puede ver y eliminar conversaciones

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Agregar modelos Conversation, Message a Prisma
- [ ] Integrar con OpenRouter/Groq API
- [ ] System prompt con contexto de la plataforma
- [ ] Tool calling para consultar órdenes del cliente
- [ ] Rate limiter por usuario
- [ ] PR a main
