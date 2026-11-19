# Validación en dispositivo físico — spec-20

Cierra el último criterio abierto de `docs/specs/spec-20-mobile-app-screens.md`
("la app compila y corre en Android/iOS"). Todo lo automatizable ya está verde:
`expo export` para android/ios, `tsc`, 169 tests y el smoke test del endpoint de
push contra el servidor real. Falta lo que solo se puede hacer con hardware.

## Qué se valida

1. La app móvil obtiene un **token real de Expo Push** y lo registra en
   `push_tokens`.
2. La push llega con la app en **primer plano**, en **segundo plano** y en
   **cold start**, y al tocarla abre `/orders/:id`.
3. Al **cerrar sesión** el token se elimina del backend.
4. El **tracking en vivo** del repartidor se mueve en el mapa del cliente.

## Requisitos

| Requisito | Nota |
|---|---|
| Cuenta Expo (gratis) | `npx -y eas-cli login` |
| Teléfono Android (recomendado) | iOS requiere Apple Developer Program de pago (APNs) |
| Teléfono en la **misma red Wi-Fi** que el PC | o un túnel HTTPS (ver paso 1) |
| Backend corriendo en `:3001` | `npm run server` |
| Android: proyecto Firebase | obligatorio para push remotas en Android |

---

## Paso 0 — backend alcanzable desde el teléfono

```powershell
# Terminal 1: backend
npm run server

# Terminal 2: detecta la IP LAN y escribe apps/mobile/.env
npm run mobile:env
npm run mobile:check        # debe quedar sin FAIL (el de projectId se resuelve en el paso 2)
```

Si `mobile:check` avisa que no alcanza `/api/v1/health`, abre el puerto en el
firewall de Windows (PowerShell **como administrador**):

```powershell
New-NetFirewallRule -DisplayName "amsterdam-api-3001" -Direction Inbound `
  -LocalPort 3001 -Protocol TCP -Action Allow
```

Verifica desde el navegador del teléfono: `http://<IP-LAN>:3001/api/v1/health`
debe devolver `200`. Si el teléfono está en otra red, usa el paso 1.

## Paso 1 — HTTPS para el APK (Android bloquea HTTP en release)

Los builds **release** de Android bloquean tráfico *cleartext*: un APK con
`EXPO_PUBLIC_API_URL=http://192.168.x.x:3001` falla con
`CLEARTEXT communication not permitted`. Dos salidas:

- **Recomendado:** exponer el backend con un túnel HTTPS (sin intersticial):

  ```powershell
  # requiere cloudflared instalado (winget install Cloudflare.cloudflared)
  cloudflared tunnel --url http://localhost:3001
  # -> https://algo-random.trycloudflare.com
  ```

  Usa esa URL como `EXPO_PUBLIC_API_URL`. El socket de tracking se deriva de
  ella y pasa a `wss://` automáticamente (`src/lib/socket.ts`).

- **Alternativa:** `npx expo run:android` con el teléfono por USB y
  `adb reverse tcp:3001 tcp:3001`, usando `http://localhost:3001`. Es un build
  *debug* (sí permite HTTP), pero para push remotas necesitas además
  `expo.android.googleServicesFile` con el `google-services.json` de Firebase.

## Paso 2 — crear/ligar el proyecto EAS (`extra.eas.projectId`)

Sin `projectId`, `getExpoPushTokenAsync` no se llama: la app registra el
warning `[push] Falta extra.eas.projectId ...` y sigue funcionando sin push.

```powershell
cd apps/mobile
npx -y eas-cli login
npx -y eas-cli init          # crea el proyecto en tu cuenta y lo liga al slug
npx -y eas-cli project:info  # confirma slug / owner / id
cd ../..
npm run mobile:check         # extra.eas.projectId debe salir OK
```

`eas init` agrega a `apps/mobile/app.json` algo así (no lo edites a mano):

```json
"extra": { "eas": { "projectId": "00000000-0000-0000-0000-000000000000" } }
```

`apps/mobile/eas.json` ya define los perfiles `preview` (APK interno) y
`production` (AAB con `autoIncrement`).

## Paso 3 — variable de entorno del build

`apps/mobile/.env` es local y **no** se sube al builder de EAS. Para builds en
la nube, define la variable en el entorno del perfil:

```powershell
npx -y eas-cli env:create --environment preview `
  --name EXPO_PUBLIC_API_URL --value https://algo-random.trycloudflare.com `
  --visibility plaintext
npx -y eas-cli env:list --environment preview
```

## Paso 4 — credenciales de push

```powershell
npx -y eas-cli credentials
```

- **Android (FCM V1):** consola de Firebase → crear proyecto → añadir app
  Android con el package `com.amsterdamtoVzla.mobile` → descargar la clave de
  cuenta de servicio (JSON) → en EAS elegir *Google Service Account* → subir el
  JSON. Sin esto el token de Expo no se entrega.
- **iOS (APNs):** en EAS elegir *Add a new Apple Push Notifications service
  key* (EAS puede generarla con tu Apple ID; requiere cuenta de desarrollador).

## Paso 5 — build e instalación

```powershell
cd apps/mobile
npx -y eas-cli build --profile preview --platform android
```

Al terminar, EAS imprime un enlace/QR para instalar el APK. Alternativa por USB:

```powershell
adb install -r ruta\al\apk.apk
```

iOS (necesita registrar el dispositivo con `npx -y eas-cli device:create`):

```powershell
npx -y eas-cli build --profile preview --platform ios
```

---

## Paso 6 — matriz de pruebas

| # | Prueba | Cómo | Esperado |
|---|---|---|---|
| 1 | Registro de token | login en la app con un cliente | en la BD: nueva fila en `push_tokens` (`platform` `android`/`ios`); en el log del server `POST /api/v1/notifications/push-token 200` |
| 2 | Push en primer plano | enviar push (abajo) con la app abierta | banner + sonido; tocar abre `/orders/:id` |
| 3 | Push en segundo plano | app en background (botón home), enviar push | notificación en la bandeja; tocar abre el pedido |
| 4 | Push en cold start | cerrar la app del todo, enviar push, tocar la notificación | la app abre directo en `/orders/:id` (`getLastNotificationResponseAsync`) |
| 5 | Logout elimina el token | perfil → cerrar sesión | log del server `DELETE /api/v1/notifications/push-token 200` con `removed: 1`; la fila desaparece de `push_tokens` |
| 6 | Logout idempotente | repetir el DELETE con el mismo token | `removed: 0` (no rompe) |
| 7 | Tracking del repartidor | repartidor abre `/driver` (app o web), asigna el pedido y pulsa compartir ubicación; el cliente abre el pedido | el marcador del mapa se mueve (evento socket `delivery:location`); con la app en background se actualiza por polling cada 15 s al volver |
| 8 | Mapa sin ubicación | pedido sin repartidor en camino | texto "Esperando ubicación del repartidor..." |

### Obtener el token y enviar un push de prueba

```powershell
# con el cliente psql apuntando a la misma BD del server
psql $env:DATABASE_URL -c "SELECT id, platform, token FROM push_tokens ORDER BY created_at DESC LIMIT 3;"
```

```powershell
$token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
$orderId = "<id-de-un-pedido-del-usuario>"
$body = @{
  to    = $token
  title = "Pedido en camino"
  body  = "Tu pedido salió del local"
  data  = @{ orderId = $orderId }
  sound = "default"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://exp.host/--/api/v2/push/send" `
  -ContentType "application/json" -Body $body
```

Respuesta esperada: `status = ok`. También se puede usar el botón "Send a
Notification" en <https://expo.dev/notifications> pegando el token.

### Cómo comprobar que el token se borró

```powershell
psql $env:DATABASE_URL -c "SELECT count(*) FROM push_tokens WHERE token = '$token';"
```

Debe devolver `0` después del logout (y `1` antes).

## Troubleshooting

| Síntoma | Causa / solución |
|---|---|
| `[push] Falta extra.eas.projectId` en los logs | paso 2 (`npx -y eas-cli init`) |
| `CLEARTEXT communication not permitted` | Android release + `http://`: usa el túnel HTTPS del paso 1 |
| Token `null` en Android | FCM V1 no configurado en EAS (`eas credentials`), o falta `googleServicesFile` en builds locales |
| Token `null` en emulador | `Device.isDevice` es `false`: usa un teléfono real |
| Push no llega en iOS | APNs key ausente/expirada (`eas credentials`) |
| Push llega pero sin sonido en Android | canal `default` con `importance: HIGH`; revisar ahorro de batería del fabricante |
| `Network request failed` / `timeout` | IP LAN incorrecta, teléfono en otra red, VPN activa o firewall del PC |
| Socket no conecta | `EXPO_PUBLIC_API_URL` debe ser `http(s)://host:puerto`; el origen se usa tal cual para Socket.io |
| `POST /api/v1/notifications/push-token 401` | sesión expirada: vuelve a iniciar sesión (el token se envía con el JWT) |

## Cerrar el spec

Cuando la matriz pase en al menos un dispositivo Android (y en iOS si hay
cuenta de desarrollador):

1. Marca el checkbox pendiente en `docs/specs/spec-20-mobile-app-screens.md`.
2. Registra fecha, dispositivo y resultados en la sección
   "Validaciones ejecutadas".
3. Corre `npm run specs` para actualizar el progreso.
