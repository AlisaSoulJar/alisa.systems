/**
 * prueba_openapi.mjs — que la especificación NO MIENTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ ESTO EXISTE.
 *
 * `openapi.json` declaraba TRES rutas. El sitio sirve al menos OCHO: las cuatro
 * `/api/*` del sitio principal —`gym`, `dataset`, `verificar`, `presencia`— y las
 * cuatro del árbitro de mesas. O sea que la especificación describía una de las dos
 * casas y se callaba la otra, incluida `/api/gym`, que es justo la puerta por la que
 * entraría un agente, y `/api/verificar`, que es toda la historia de que aquí una
 * partida se puede volver a jugar.
 *
 * Y eso importa más de lo que parece. La razón de tener una API declarada es que
 * alguien de fuera pueda escribir un cliente SIN leerse nuestro código. Una
 * especificación incompleta no ahorra ese trabajo: lo esconde. Es peor que no tener
 * ninguna, porque quien la lee cree que ya lo ha visto todo.
 *
 * ⚠️ Y SE COMPRUEBA EN LOS DOS SENTIDOS, QUE ES LO QUE SE OLVIDA.
 *
 *   · lo declarado EXISTE — una ruta en el papel que ya no responde;
 *   · lo que existe está DECLARADO — una puerta nueva que nadie apuntó.
 *
 * La segunda es la que se pudre sola: añadir un endpoint es un momento de trabajo y
 * acordarse de la especificación es un acto de voluntad. Aquí deja de serlo.
 *
 * No pide red por defecto: comparar el papel con los ficheros ya caza el caso que
 * importa. Con `--red` además llama a las rutas de lectura y comprueba que contestan.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const conRed = process.argv.includes('--red');

const spec = JSON.parse(await readFile(path.join(AQUI, 'public/openapi.json'), 'utf8'));
const declaradas = new Set(Object.keys(spec.paths ?? {}));

console.log('\n¿Dice la verdad `openapi.json`?\n');

/**
 * Las puertas de VERDAD, leídas del disco y no de una lista escrita a mano — que
 * sería otra copia que se separa.
 *
 *   · `functions/api/*.js` son las del sitio: Cloudflare Pages las publica en
 *     `/api/<nombre>` por convención de carpetas.
 *   · el árbitro tiene las suyas dentro de `worker-mesas/mesas.js`.
 */
const reales = new Set();
for (const f of await readdir(path.join(AQUI, 'functions/api')).catch(() => [])) {
    if (f.endsWith('.js')) reales.add(`/api/${f.replace(/\.js$/, '')}`);
}

const arbitro = await readFile(path.join(AQUI, 'worker-mesas/mesas.js'), 'utf8');
for (const m of arbitro.matchAll(/accion === '(\w+)'/g)) {
    // `reportes` es el plural de `reporte` y comparten manejador: una sola puerta.
    if (m[1] !== 'reportes') reales.add(`/mesa/{sala}/${m[1]}`);
}
reales.add('/mesa/{sala}');          // el estado de la mesa, sin acción

const faltan = [...reales].filter(r => !declaradas.has(r)).sort();
const sobran = [...declaradas].filter(r => !reales.has(r)).sort();

for (const r of [...declaradas].sort()) console.log(`  ${reales.has(r) ? '✓' : '✗'} declarada  ${r}`);
for (const r of faltan) console.log(`  ✗ SIN DECLARAR  ${r}`);

if (conRed) {
    console.log('\n  y contestando de verdad:');
    const base = 'https://alisa.systems';
    for (const r of [...reales].filter(x => x.startsWith('/api/'))) {
        try {
            const res = await fetch(base + r, { signal: AbortSignal.timeout(20000) });
            console.log(`    ${res.ok ? '✓' : '✗'} ${r} → ${res.status}`);
        } catch (e) {
            console.log(`    ✗ ${r} → ${String(e.message).slice(0, 40)}`);
        }
    }
}

console.log('');
if (faltan.length || sobran.length) {
    if (faltan.length) console.log(`  ✗ ${faltan.length} puerta(s) abiertas y sin declarar: ${faltan.join(', ')}`);
    if (sobran.length) console.log(`  ✗ ${sobran.length} declarada(s) que ya no existen: ${sobran.join(', ')}`);
    console.log('    Una especificación incompleta es peor que ninguna: quien la lee cree que ya lo ha visto todo.');
    process.exit(1);
}
console.log(`  ✓ las ${reales.size} puertas están declaradas, y no sobra ninguna`);
