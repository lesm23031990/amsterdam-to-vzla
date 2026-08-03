---
title: "Spec 20 — Mobile App Screens"
labels: ["spec"]
assignees: []
---

## Endpoints

### All existing backend API endpoints (same as web)
All endpoints at `api/v1/*` are reused by the mobile app.

### POST /api/v1/auth/register
User registration (same as web).

### POST /api/v1/auth/login
User login (same as web).

## Request

### POST /api/v1/auth/login
```json
{
  "email": "user@example.com",
  "password": "********"
}
```

### POST /api/v1/auth/register
```json
{
  "email": "user@example.com",
  "password": "********",
  "name": "User Name",
  "role": "cliente | tienda | repartidor"
}
```

## Response

### Éxito — 200 (login)
```json
{
  "ok": true,
  "data": {
    "token": "jwt-token",
    "user": { "id": "string", "name": "User", "email": "user@example.com", "role": "cliente" }
  }
}
```

## Behavior
- Expo Router for navigation with file-based routing
- Bottom tab navigation: Home, Categories, Cart, Orders, Profile
- Shared API client (axios/fetch) pointing to backend URL from env
- Auth token stored in SecureStore and attached to all requests
- Screens to build:

  1. **Home**: Product grid, search bar, horizontal category chips
  2. **Login/Register**: Auth forms with role selector, validation, error display
  3. **Store List**: Browse stores with search, category filter
  4. **Store Detail**: Products by store, add to cart
  5. **Product Detail**: Image carousel, price, description, quantity selector, add to cart
  6. **Cart**: Items grouped by store, quantity controls, total, checkout button
  7. **Checkout**: Address form, payment method selector (Binance, cash, transfer), confirm
  8. **Orders**: List of orders with status badge
  9. **Order Detail**: Status step tracker, delivery map (WebView with Leaflet or react-native-maps)
  10. **Driver View**: Assigned deliveries list, status update buttons, location sharing
  11. **AI Assistant**: Chat interface with message bubbles, text input

- Push notifications via Expo push notifications service
- Map: use WebView for Leaflet map (shared component) or react-native-maps
- Cart state managed globally (React Context or Zustand)
- Dark mode support (follow system preference)
- Error boundaries and loading states on every screen
- Pull-to-refresh on data lists

## Acceptance Criteria
- [ ] App builds and runs on both Android and iOS
- [ ] User can register, login, browse products
- [ ] User can add to cart and checkout
- [ ] User can track delivery on map
- [ ] Driver can update location
- [ ] Push notifications work

---

## Tareas Técnicas
- [ ] Set up Expo project with TypeScript and Expo Router
- [ ] Configure bottom tab navigation
- [ ] Build shared API client with auth interceptor
- [ ] Implement SecureStore token persistence
- [ ] Build Home screen
- [ ] Build Login/Register screens
- [ ] Build Store List and Store Detail screens
- [ ] Build Product Detail screen
- [ ] Build Cart screen with store grouping
- [ ] Build Checkout screen
- [ ] Build Orders list and Order Detail screens
- [ ] Build Driver view screen
- [ ] Build AI Assistant chat screen
- [ ] Integrate delivery map (WebView or react-native-maps)
- [ ] Set up push notifications (Expo)
- [ ] Write tests (TDD)
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
