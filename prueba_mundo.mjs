/**
 * UNA SOLA DECLARACIÓN DE DÓNDE ESTÁ EL MOTOR
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_mundo.mjs
 *
 * `montarMundo` existe para que los juegos que son UN SITIO dejen de copiarse el
 * andamio. Y el andamio copiado no falla ruidosamente: falla quedándose corto.
 * Medido antes de escribirlo, sobre las seis etapas de la saga:
 *
 *     5/6  AlisaRenderCore          el núcleo
 *     3/6  OrbitControls
 *     2/6  CinematicPipelinePlugin  ← el que hace bonito a lo bonito
 *
 * Dos de seis. Nadie lo quitó: nadie lo copió. Por eso esto vigila tres cosas que
 * devuelven el proyecto a ese estado sin dar un error:
 *
 *   1. que una página que usa `montarMundo` cargue el mapa común ANTES —si no,
 *      `three` no resuelve y la página muere entera;
 *   2. que no lleve además su propio `importmap` —dos mapas es error de
 *      navegador, y si el suyo gana, se queda en la versión vieja de three;
 *   3. que el pipeline siga puesto POR DEFECTO en `montarMundo.js`. Si alguien lo
 *      pasa a opcional «para que no moleste», volvemos a dos de seis.
 *
 * ⚠️ LO QUE ESTO NO PUEDE COMPROBAR, Y HAY QUE DECIRLO.
 * Que el `importmap` inyectado por un script clásico llegue a tiempo es cosa del
 * navegador, no de Node. Eso se comprueba en `public/games/_prueba_mundo.html`,
 * que hay que abrir de verdad. Aquí sólo se vigila el contrato estático.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const SALTAR = /node_modules|[\\/]vendor[\\/]|_archivo|dist_publico|[\\/]dist[\\/]|\.git|legacy/;

async function* recorrer(dir) {
    let e;
    try { e = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
        const p = path.join(dir, x.name);
        if (SALTAR.test(p)) continue;
        if (x.isDirectory()) yield* recorrer(p);
        else if (x.name.endsWith('.html')) yield p;
    }
}

console.log('\nUna sola declaración de dónde está el motor\n');
const fallos = [];

// ── 1 y 2 — las páginas que ya usan `montarMundo` ──
const usan = [];
for await (const f of recorrer('public')) {
    const t = await readFile(f, 'utf-8');
    if (!t.includes('montarMundo')) continue;
    usan.push({
        f,
        mapaComun: /<script[^>]+src=["']\/js\/mundo\.js["']/.test(t),
        mapaPropio: /<script\s+type=["']importmap["']/.test(t),
    });
}

if (!usan.length) {
    fallos.push('ninguna página usa `montarMundo`: o se deshizo la migración, o esta comprobación busca mal');
} else {
    const sinMapa = usan.filter((u) => !u.mapaComun).map((u) => path.basename(u.f));
    const conDos = usan.filter((u) => u.mapaPropio).map((u) => path.basename(u.f));
    if (sinMapa.length) fallos.push(`usan montarMundo y no cargan /js/mundo.js: ${sinMapa.join(', ')}`);
    else console.log(`  ${verde('✓')} las ${usan.length} páginas con montarMundo cargan el mapa común`);
    if (conDos.length) fallos.push(`llevan además su propio importmap (gana el suyo, y es three viejo): ${conDos.join(', ')}`);
    else console.log(`  ${verde('✓')} ninguna declara además el suyo propio`);
}

/**
 * Quita comentarios antes de mirar.
 *
 * Sin esto, la primera versión suspendía por su propia documentación: `mundo.js`
 * nombra la 0.160 en un comentario —es la medición que justifica el cambio— y la
 * 0.170 en el mapa de verdad, y el contador veía dos versiones. `preflight.py` ya
 * hace justamente esto con las marcas ajenas, y por el mismo motivo: una casa
 * donde nombrar un problema te acusa de tenerlo acaba sin comentarios que
 * expliquen nada.
 */
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── 3 — el mapa común apunta a UNA versión, y es la del arcade ──
{
    const mapa = sinComentarios(await readFile(path.join('public', 'js', 'mundo.js'), 'utf-8'));
    const versiones = [...new Set([...mapa.matchAll(/three-(\d+\.\d+\.\d+)/g)].map((m) => m[1]))];
    if (versiones.length !== 1) {
        fallos.push(`mundo.js nombra ${versiones.length} versiones de three (${versiones.join(', ')}): tiene que ser una`);
    } else {
        const arcade = sinComentarios(
            await readFile(path.join('public', 'arcade', 'js', 'montarMesa.js'), 'utf-8'));
        const suya = [...new Set([...arcade.matchAll(/three-(\d+\.\d+\.\d+)/g)].map((m) => m[1]))];
        if (!suya.includes(versiones[0])) {
            fallos.push(`los mundos van a three ${versiones[0]} y las mesas a ${suya.join('/')}: dos versiones otra vez`);
        } else {
            console.log(`  ${verde('✓')} mundos y mesas comparten three ${versiones[0]}`);
        }
    }
}

/**
 * ── 4 — ⚠️ LA QUE PROTEGE DE VERDAD ──
 *
 * El pipeline tiene que venir PUESTO. Toda la razón de ser de `montarMundo` es
 * que dejara de depender de que alguien se acordara — pasó de 2 de 6 a 6 de 6
 * exactamente por esto. Si un día se cambia a `cfg.cine === true`, la migración
 * se deshace sola y en silencio: las páginas seguirán funcionando, sólo que
 * feas, y nadie mira la fealdad en una batería de pruebas.
 */
{
    const m = await readFile(path.join('public', 'js', 'montarMundo.js'), 'utf-8');
    const porDefecto = m.includes('cfg.cine !== false');
    const registra = m.includes('registerPlugin(cine)');
    const pinta = m.includes('cine.renderFn');
    if (!porDefecto) fallos.push('el pipeline ya no va puesto por defecto: volvemos a que haya que acordarse');
    else if (!registra) fallos.push('el pipeline se crea y no se registra: no haría nada');
    else if (!pinta) fallos.push('el pipeline se registra y no se pinta con él: post-proceso vivo que no llega a la pantalla');
    else console.log(`  ${verde('✓')} el pipeline va puesto, registrado y pintando`
        + gris(' (hay que pedir que se quite, no que se ponga)'));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ un solo mapa, una sola versión, y el pipeline puesto de serie\n'));
