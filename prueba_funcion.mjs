/**
 * prueba_funcion.mjs — probar la Function de Cloudflare SIN Cloudflare
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_funcion.mjs
 *
 * `functions/api/verificar.js` está escrita con APIs web estándar —`Request`,
 * `Response`, `fetch`— que Node 22 trae de serie. Así que su manejador se puede
 * invocar aquí con una petición sintética y comprobar de verdad, en vez de
 * subirla y rezar.
 *
 * Lo único que este banco NO puede probar es el entorno de Cloudflare: que
 * `fetch` de un activo del propio sitio traiga `card_library.json`. Aquí eso se
 * simula sirviendo el fichero del disco. Por eso, tras desplegar, la prueba de
 * aceptación es comparar `GET /api/verificar` con la huella local: si blackjack
 * y póker no coinciden, el activo no se está leyendo y las cartas caerían al
 * respaldo **en silencio**.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGEN = 'https://alisa.systems';

// El `fetch` del Worker, simulado: los activos del sitio salen de `public/`.
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.origin === ORIGEN) {
        const f = path.join(AQUI, 'public', url.pathname);
        return new Response(await readFile(f, 'utf-8'), { status: 200 });
    }
    if (url.protocol === 'file:') {
        return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
    }
    return fetchReal(entrada, init);
};

const fn = await import('./functions/api/verificar.js');
const peticion = (cuerpo) => new Request(`${ORIGEN}/api/verificar`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
});

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;

// ── 1. la huella de este lado ────────────────────────────────────
const huellas = (await (await fn.onRequestGet({
    request: new Request(`${ORIGEN}/api/verificar`) })).json()).huellas;

console.log('\n  HUELLAS DE LAS REGLAS (Function)');
for (const [j, h] of Object.entries(huellas)) console.log(`    ${j.padEnd(10)} ${h}`);

// ── 2. una partida legítima y tres trampas, por juego ────────────
// Se juegan con el mismo entorno que usa el navegador.
const { pathToFileURL } = await import('node:url');
const reg = await import(
    pathToFileURL(path.join(AQUI, 'public/js/alisa-engine/src/gym/registro.js')).href);

console.log('\n  PARTIDAS');
let bien = 0, total = 0, cazadas = 0, intentos = 0;
for (const juego of Object.keys(huellas)) {
    const Env = await reg.cargar(`alisa/${juego}-protohub-v0`);
    const env = new Env();
    env.runEpisode(reg.politicaAzar(11), { seed: 2026, maxSteps: 220 });
    const partida = env.partida();

    const pedir = async (c) => (await fn.onRequestPost({ request: peticion(c) })).json();
    const ok = await pedir(partida);
    const inflada = await pedir({ ...partida, puntos: 9999 });
    const colada = await pedir({ ...partida, jugadas: [...partida.jugadas, 'inventada'] });

    total++;
    const cuadra = ok.valida && ok.puntos === partida.puntos;
    if (cuadra) bien++;
    intentos += 2;
    if (!inflada.valida) cazadas++;
    if (!colada.valida) cazadas++;

    console.log(`    ${cuadra ? verde('✓') : rojo('✗')} ${juego.padEnd(10)}`
        + ` dice ${String(partida.puntos).padStart(7)} · sale ${String(ok.puntos).padStart(7)}`
        + ` · ${String(partida.jugadas.length).padStart(4)} jugadas`
        + ` · ${ok.ms} ms`
        + (cuadra ? '' : rojo(`  ← ${ok.motivo}`)));
}

console.log(`\n  ${bien === total ? verde(`${bien}/${total} legítimas aceptadas`)
                                  : rojo(`${bien}/${total} legítimas aceptadas`)}`
    + ` · ${cazadas === intentos ? verde(`${cazadas}/${intentos} trampas cazadas`)
                                 : rojo(`${cazadas}/${intentos} trampas cazadas`)}`);
console.log('\n  Falta por probar en producción: que el activo card_library.json');
console.log('  se lea desde el Worker. Prueba de aceptación tras desplegar:');
console.log('    curl https://alisa.systems/api/verificar   ← ¿misma huella?\n');

process.exit(bien === total && cazadas === intentos ? 0 : 1);
