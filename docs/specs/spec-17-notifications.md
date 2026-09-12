---
title: "Spec 17 — Notifications"
labels: ["spec"]
assignees: []
status: in-progress
---

## Endpoints

### GET /api/v1/notifications
List user's notifications (paginated). Query: `?unread=true&page=1&limit=20`.

### PATCH /api/v1/notifications/:id/read
Mark a single notification as read.

### PATCH /api/v1/notifications/read-all
Mark all notifications as read.

### Socket.io event `notification:new`
Emitted to user's room when a new notification is created.

## Request

### GET /api/v1/notifications
Headers: `Authorization: Bearer <token>`

### PATCH /api/v1/notifications/:id/read
Headers: `Authorization: Bearer <token>`

### PATCH /api/v1/notifications/read-all
Headers: `Authorization: Bearer <token>`

## Response

### Éxito — 200 (list)
```json
{
  "ok": true,
  "data": {
    "notifications": [
      {
        "id": "string",
        "type": "order_status",
        "title": "Pedido confirmado",
        "message": "Tu pedido #123 ha sido confirmado",
        "read": false,
        "createdAt": "2025-07-01T12:00:00Z",
        "data": { "orderId": "123", "status": "confirmed" }
      }
    ],
    "total": 25,
    "unreadCount": 3,
    "page": 1,
    "limit": 20
  }
}
```

### Éxito — 200 (mark read)
```json
{
  "ok": true,
  "data": { "read": true }
}
```

## Behavior
- Notification model in Prisma: id, userId, type (enum), title, message, read (boolean), createdAt, data (JSON)
- Notifications created automatically on: order confirmed, driver assigned, status change, payment confirmed
- Socket.io emits `notification:new` to user's room in real-time
- Navbar bell icon shows unread count badge
- Dropdown shows last 10 unread notifications
- Click notification marks as read and navigates to relevant page (e.g., order detail)
- `/notifications` page shows full history with pagination
- "Mark all as read" button on notifications page
- Individual mark-as-read via click
- Sound/visual indicator for new notifications (optional)
- Only authenticated users can access their own notifications

## Acceptance Criteria
- [x] Notification created when order status changes
- [x] Bell icon shows unread count
- [x] Clicking notification navigates to relevant page
- [x] Real-time notification via Socket.io
- [x] Can mark as read individually or all at once

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [x] Add Notification model to Prisma schema
- [x] Run Prisma migration
- [x] Create `GET /api/v1/notifications` endpoint
- [x] Create `PATCH /api/v1/notifications/:id/read` endpoint
- [x] Create `PATCH /api/v1/notifications/read-all` endpoint
- [x] Implement notification creation on key events
- [x] Emit `notification:new` via Socket.io
- [x] Build bell icon + dropdown component
- [x] Build `/notifications` page
- [ ] Connect frontend to Socket.io notification room
- [x] Integrar con frontend
- [x] Integrar con mobile
- [x] PR a main
