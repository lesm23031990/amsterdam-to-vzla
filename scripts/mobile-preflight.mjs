#!/usr/bin/env node
/**
 * Preflight de la validación en dispositivo físico (spec-20).
 *
 * Verifica que el entorno móvil esté listo para emitir un token de Expo Push
 * y hablar con el backend desde un teléfono en la misma red Wi-Fi.
 *
 * Uso:
 *   node scripts/mobile-preflight.mjs                 # solo verifica
 *   node scripts/mobile-preflight.mjs --write-env     # escribe apps/mobile/.env
 *   node scripts/mobile-preflight.mjs --port 4000     # otro puerto de backend
 *
 * Salida: una línea por chequeo (OK / WARN / FAIL) y un resumen final.
 * Código de salida 1 si algún chequeo es FAIL.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP_JSON = path.join(ROOT, 'apps', 'mobile', 'app.json');
const ENV_FILE = path.join(ROOT, 'apps', 'mobile', '.env');
const DEFAULT_PORT = '3001';

const argv = process.argv.slice(2);
const flagIndex = argv.indexOf('--port');
const PORT = flagIndex >= 0 && argv[flagIndex + 1] ? argv[flagIndex + 1] : DEFAULT_PORT;
const WRITE_ENV = argv.includes('--write-env');

const results = [];
const ok = (msg) => results.push({ level: 'OK', msg });
const warn = (msg) => results.push({ level: 'WARN', msg });
const fail = (msg) => results.push({ level: 'FAIL', msg });

/** Interfaces virtuales que no sirven para que un teléfono llegue al backend. */
const VIRTUAL_IFACE = /(vEthernet|VMware|VirtualBox|Hyper-V|WSL|Loopback|Docker|Tailscale|ZeroTier|TAP|TUN)/i;

/** Devuelve la IPv4 LAN más probable, priorizando rangos privados domésticos. */
function detectLanIp() {
  const candidates = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      candidates.push({ name, address: address.address, virtual: VIRTUAL_IFACE.test(name) });
    }
  }

  const physical = candidates.filter((c) => !c.virtual);
  const pool = physical.length > 0 ? physical : candidates;
  const byRange = (re) => pool.find((c) => re.test(c.address));

  return byRange(/^192\.168\./) ?? byRange(/^10\./) ?? byRange(/^172\.(1[6-9]|2\d|3[01])\./) ?? pool[0] ?? null;
}

function readEnvValue(file, key) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && match[1] === key) return match[2].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function writeEnvFile(url) {
  const header = [
    '# Generado por scripts/mobile-preflight.mjs (npm run mobile:env).',
    '# Archivo ignorado por git; no lo edites a mano si volverás a correr el script.',
    '',
  ];
  fs.writeFileSync(ENV_FILE, `${header.join('\n')}EXPO_PUBLIC_API_URL=${url}\n`, 'utf8');
}

async function checkAppJson() {
  if (!fs.existsSync(APP_JSON)) {
    fail('No existe apps/mobile/app.json');
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  } catch (error) {
    fail(`apps/mobile/app.json no es JSON válido: ${error.message}`);
    return;
  }

  const expo = config.expo ?? {};
  const plugins = (expo.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
  for (const plugin of ['expo-router', 'expo-notifications', 'expo-location']) {
    if (plugins.includes(plugin)) ok(`plugin ${plugin} configurado`);
    else fail(`falta el plugin ${plugin} en app.json`);
  }

  const projectId = expo.extra?.eas?.projectId;
  if (typeof projectId === 'string' && projectId.length > 0) {
    ok(`extra.eas.projectId = ${projectId}`);
  } else {
    fail(
      'falta extra.eas.projectId: corre `npx eas-cli init` dentro de apps/mobile (sin él la app omite el registro de push)'
    );
  }

  if (expo.android?.package) ok(`android.package = ${expo.android.package}`);
  else fail('falta android.package (obligatorio para builds nativos)');

  if (expo.ios?.bundleIdentifier) ok(`ios.bundleIdentifier = ${expo.ios.bundleIdentifier}`);
  else fail('falta ios.bundleIdentifier (obligatorio para builds de iOS)');

  if ((expo.ios?.infoPlist?.UIBackgroundModes ?? []).includes('remote-notification')) {
    ok('iOS UIBackgroundModes incluye remote-notification');
  } else {
    warn('iOS UIBackgroundModes no incluye remote-notification: las push en background no llegarán');
  }
}

async function checkEnvAndBackend(lanUrl) {
  const currentUrl = readEnvValue(ENV_FILE, 'EXPO_PUBLIC_API_URL');

  if (WRITE_ENV) {
    if (!lanUrl) fail('no se puede escribir .env sin IP LAN');
    else {
      writeEnvFile(lanUrl);
      ok(`apps/mobile/.env escrito con EXPO_PUBLIC_API_URL=${lanUrl}`);
    }
  } else if (!currentUrl) {
    warn('apps/mobile/.env sin EXPO_PUBLIC_API_URL (corre `npm run mobile:env`)');
  } else if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(currentUrl)) {
    warn(`EXPO_PUBLIC_API_URL=${currentUrl} no es alcanzable desde un teléfono; usa la IP LAN`);
  } else {
    ok(`EXPO_PUBLIC_API_URL=${currentUrl}`);
  }

  const effectiveUrl = WRITE_ENV && lanUrl ? lanUrl : currentUrl;
  if (effectiveUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(effectiveUrl)) {
    ok('el origen del socket de tracking se deriva de la misma URL');
  }

  if (!lanUrl) return;
  try {
    const response = await fetch(`${lanUrl}/api/v1/health`, { signal: AbortSignal.timeout(4000) });
    if (response.ok) ok(`GET ${lanUrl}/api/v1/health -> ${response.status}`);
    else warn(`GET ${lanUrl}/api/v1/health -> ${response.status} (revisa el servidor)`);
  } catch {
    warn(`no se pudo alcanzar ${lanUrl}: arranca el backend y permite el puerto ${PORT} en el firewall`);
  }
}

async function main() {
  const lan = detectLanIp();
  const lanUrl = lan ? `http://${lan.address}:${PORT}` : null;

  if (lan) ok(`IP LAN detectada: ${lan.address} (${lan.name}) -> ${lanUrl}`);
  else fail('No se encontró una IPv4 LAN. Conéctate a la misma red Wi-Fi que el teléfono.');

  await checkAppJson();
  await checkEnvAndBackend(lanUrl);

  warn('eas-cli no es dependencia del repo: usa `npx -y eas-cli <comando>`');

  for (const { level, msg } of results) console.log(`[${level}] ${msg}`);

  const failures = results.filter((r) => r.level === 'FAIL').length;
  const warnings = results.filter((r) => r.level === 'WARN').length;
  console.log(`\n${results.length} chequeos: ${failures} FAIL, ${warnings} WARN`);
  console.log('Guía completa: docs/MOBILE-DEVICE-VALIDATION.md');

  process.exitCode = failures > 0 ? 1 : 0;
}

await main();
