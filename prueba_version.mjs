/**
 * prueba_version.mjs — que la versión de la URL corresponda al código que hay
 * ═══════════════════════════════════════════════════════════════════════════
 * `montarMesa` carga los motores creando etiquetas <script> a mano, y les pega
 * `?v=VERSION`. Eso es lo que impide que un navegador empareje una copia guardada
 * con código nuevo — la avería que nos costó una tarde: `mesa_cartas.mjs` nuevo
 * contra `montarMesa.js` viejo, una combinación que nunca existió en el repo.
 *
 * Pero una versión escrita a mano es exactamente lo que este proyecto lleva
 * arreglando todo el rato: una lista que se separa de la realidad en silencio. Si
 * alguien toca el motor y no la sube, la protección deja de proteger sin avisar —
 * y encima parecería que sigue puesta.
 *
 * Así que no se recuerda: se calcula. Esto resume lo que `montarMesa` puede
 * cargar y compara. Si no cuadra, dice el número exacto que hay que escribir.
 *
 * ⚠️ Ojo con lo que NO entra en el resumen: el vendor (va sellado en su ruta,
 * `three-r128`) y `montarMesa.js` mismo, que no puede contener su propio hash.
 * `montarMesa.js` no lo necesita: lo carga la página con `import`, y las páginas
 * se sirven siempre frescas.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const JS = new URL('./public/arcade/js/', import.meta.url);

/** Todo lo que `cargar()` puede pedir: los motores, la entrada, y los visualizadores. */
async function ficherosSellados() {
    const sueltos = ['Entrada.js', 'SovereignBoardEngine.js', 'SovereignCardEngine.js',
                     'arcade_mats.js'];
    // Los visualizadores no son una lista: son lo que hay. Una lista escrita aquí
    // se separaría del directorio el día que alguien añada uno.
    const hay = await readdir(JS, { withFileTypes: true });
    const vis = hay.filter(e => e.isFile() && /_visualizer\.js$|^mesa_\w+\.mjs$/.test(e.name))
                   .map(e => e.name);
    return [...new Set([...sueltos, ...vis])].sort();
}

/**
 * ⚠️ Y LAS HOJAS DE ESTILO, QUE FALTABAN.
 *
 * El resumen sólo miraba los `.js`, así que cambiar el CSS no subía la versión y el
 * sello seguía siendo el mismo: los navegadores servían la hoja guardada. Salió el
 * 13-08-2026, cuando el arreglo de que el panel dejara pasar los clics resultó vivir
 * entero en `jugables.css` — desplegado, correcto, y sin llegar a quien ya había
 * abierto una mesa.
 *
 * Una protección con un agujero del tamaño de una hoja de estilo protege de menos
 * de lo que dice, y eso es peor que no tenerla, porque uno se fía.
 */
const CSS = new URL('./public/arcade/css/', import.meta.url);

async function hojasSelladas() {
    const hay = await readdir(CSS, { withFileTypes: true });
    return hay.filter(e => e.isFile() && e.name.endsWith('.css')).map(e => e.name).sort();
}

const nombres = await ficherosSellados();
const hojas = await hojasSelladas();
const resumen = createHash('sha256');
const faltan = [];
for (const n of nombres) {
    try { resumen.update(n).update(await readFile(new URL(n, JS))); }
    catch { faltan.push(n); }
}
for (const n of hojas) {
    try { resumen.update(n).update(await readFile(new URL(n, CSS))); }
    catch { faltan.push(n); }
}
const esperado = resumen.digest('hex').slice(0, 8);

const fuente = await readFile(new URL('./montarMesa.js', JS), 'utf-8');
const m = fuente.match(/const VERSION = '([0-9a-f]{8})';/);

console.log('\n¿La versión de la URL corresponde al código?\n');
console.log(`  ${nombres.length} ficheros sellados: ${nombres.join(', ')}`);
if (faltan.length) console.log(`  ⚠ nombrados y ausentes: ${faltan.join(', ')}`);

let fallos = 0;
if (!m) {
    fallos++;
    console.log('\n  ✗ `montarMesa.js` no declara `const VERSION = \'········\';`.');
    console.log('    Sin eso los scripts van sin sellar y un despliegue puede llegar a medias.');
} else if (m[1] !== esperado) {
    fallos++;
    console.log(`\n  ✗ dice '${m[1]}' y el código resume '${esperado}'.`);
    console.log('    Alguien cambió un motor sin subir la versión, así que los navegadores');
    console.log('    seguirían sirviendo el anterior desde su copia guardada, sin dar error.');
    console.log(`\n    Escribe en montarMesa.js:   const VERSION = '${esperado}';`);
} else {
    console.log(`\n  ✓ versión '${esperado}' — al día`);
}

if (fallos) process.exit(1);
