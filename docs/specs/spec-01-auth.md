---
title: "Spec 01 — Auth: Registro, Login y Gestión de Sesión"
labels: ["spec"]
assignees: []
---

## Endpoints

### POST /api/v1/auth/register
Registro de nuevo usuario (solo cliente).

### POST /api/v1/auth/login
Inicio de sesión para cualquier rol.

### GET /api/v1/auth/me
Obtener perfil del usuario autenticado.

### PATCH /api/v1/auth/me
Actualizar perfil del usuario autenticado.

## Request

### POST /api/v1/auth/register
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Str0ngPass!",
  "name": "Juan Pérez",
  "phone": "+584141234567"
}
```

### POST /api/v1/auth/login
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Str0ngPass!"
}
```

### PATCH /api/v1/auth/me
Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Juan Actualizado",
  "phone": "+584141234568"
}
```

## Response

### POST /api/v1/auth/register — 201
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@ejemplo.com",
      "name": "Juan Pérez",
      "phone": "+584141234567",
      "role": "cliente",
      "createdAt": "2026-07-27T00:00:00.000Z"
    },
    "token": "jwt.token.aqui"
  }
}
```

### POST /api/v1/auth/login — 200
```json
{
  "ok": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "name": "...", "role": "cliente" },
    "token": "jwt.token.aqui"
  }
}
```

### GET /api/v1/auth/me — 200
```json
{
  "ok": true,
  "data": { "id": "uuid", "email": "...", "name": "...", "role": "cliente", "phone": "...", "createdAt": "..." }
}
```

### Errores — 400 / 401
```json
{
  "ok": false,
  "error": "mensaje de error"
}
```

## Behavior
- **Roles válidos:** `cliente`, `admin` (admin se crea solo desde semilla)
- **Registro público:** siempre crea rol `cliente` (no se envía role en el request)
- **Password** mínimo 8 caracteres, 1 mayúscula, 1 número
- **Email** único por usuario, validación de formato
- **JWT** expira en 7 días, incluye `userId`, `role`, `email`
- **Hash** de password con bcrypt (salt rounds 12)
- **Rate limit:** 5 intentos de login por minuto por IP
- No existe rol "tienda" ni "repartidor" — todos los usuarios registrados son clientes

## Acceptance Criteria
- [ ] Un usuario puede registrarse con email, password, name y phone
- [ ] Usuario registrado siempre tiene rol `cliente`
- [ ] Un usuario puede iniciar sesión con email y password y recibe un JWT
- [ ] Un usuario puede obtener su perfil con un token válido
- [ ] Un usuario puede actualizar su perfil con un token válido
- [ ] Email duplicado devuelve error 400
- [ ] Credenciales inválidas devuelven error 401
- [ ] Token expirado o inválido devuelve error 401
- [ ] Password débil devuelve error 400 con validaciones específicas
- [ ] Rate limit de login funciona correctamente

---

## Tareas Técnicas
- [ ] Escribir tests (TDD)
- [ ] Configurar Prisma con modelo User (sin Store)
- [ ] Implementar middleware auth con JWT
- [ ] Implementar rutas register, login, me
- [ ] Integrar con frontend web
- [ ] Integrar con mobile
- [ ] PR a main
