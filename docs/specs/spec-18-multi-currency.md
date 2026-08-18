---
title: "Spec 18 — Multi-currency Display"
labels: ["spec"]
assignees: []
---

## Endpoints

### GET /api/v1/rates
Returns current exchange rates. Query: `?base=USD`.

### GET /api/v1/products
Accept `?currency=Bs|COP|USD` to return prices in requested currency.

### GET /api/v1/brands/:slug/products
Accept `?currency=Bs|COP|USD` to return prices in requested currency.

## Request

### GET /api/v1/rates
Headers: `Authorization: Bearer <token>` (optional)

### GET /api/v1/products?currency=Bs
Headers: `Authorization: Bearer <token>` (optional)

## Response

### Éxito — 200 (rates)
```json
{
  "ok": true,
  "data": {
    "base": "USD",
    "rates": {
      "Bs": 36.50,
      "COP": 4200.00,
      "USD": 1.00
    },
    "updatedAt": "2025-07-01T12:00:00Z"
  }
}
```

### Éxito — 200 (products with converted prices)
```json
{
  "ok": true,
  "data": {
    "products": [
      {
        "id": "string",
        "name": "Producto",
        "price": 365.00,
        "priceUsd": 10.00,
        "currency": "Bs",
        "displayPrice": "Bs. 365,00"
      }
    ]
  }
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
- Currency selector in navbar: Bs / COP / USD
- All prices on the page convert based on selected currency
- Formatting rules:
  - Bs: `Bs. 1.234,56` (period for thousands, comma for decimals)
  - COP: `COP $ 5.000` (no decimals)
  - USD: `USD $ 10.00` (two decimals)
- Preference persisted in localStorage
- Exchange rates obtained from `GET /api/v1/rates` on page load and cached for 5 minutes
- Products API accepts `?currency=` param to return pre-converted prices
- If no currency param, prices returned in USD (default)
- Exchange rate source configurable via env vars (mock, Al Cambio API, or manual)
- Backend stores rates in DB or env vars with update mechanism

## Acceptance Criteria
- [ ] User can switch between Bs, COP, USD
- [ ] All prices update dynamically
- [ ] Preference persists across sessions
- [ ] Exchange rates are configurable

---

## Tareas Técnicas
- [ ] Write tests (TDD)
- [ ] Create `GET /api/v1/rates` endpoint
- [ ] Add `?currency` param support to product endpoints
- [ ] Create currency formatting utility
- [ ] Build currency selector component in navbar
- [ ] Implement localStorage persistence
- [ ] Add rate caching (5 min) on frontend
- [ ] Make exchange rate source configurable
- [ ] Integrar con frontend
- [ ] Integrar con mobile
- [ ] PR a main
