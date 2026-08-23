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
 * ⚠️ Y LO QUE FALTA AQUÍ NO ES UN AGUJERO. LO COMPROBÉ ANTES DE «ARREGLARLO».
 *
 * El resumen no cubre `js/protohub/` —ni el pintor, ni el sustrato, ni las
 * reglas—, y además esos ficheros se importan como módulos con rutas normales,
 * así que ni siquiera podrían llevar `?v=`. Visto así parece el mismo fallo que
 * el del CSS con otra ropa, y me puse a arreglarlo.
 *
 * Antes lo medí, y no lo es. El sitio sirve TODO con:
 *
 *     cache-control: public, must-revalidate, max-age=0
 *
 * o sea que el navegador revalida cada fichero en cada carga y no puede quedarse
 * con uno viejo. El `?v=` es cinturón además de tirantes: cubre el caso de que
 * mañana alguien ponga caché larga, y por eso se queda.
 *
 * Ampliarlo a `protohub/` habría sido una refactorización entera para arreglar
 * algo que no estaba roto. Media hora de medir, ahorrada.
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
    /**
     * ⚠️ LA LISTA SE LEE DE `montarMesa.js`, QUE ES QUIEN SELLA. ERA A MANO.
     *
     * Aquí había cuatro nombres escritos —`Entrada.js`, los dos motores y
     * `arcade_mats.js`— y `montarMesa.js` sella además todo su `ANDAMIO`:
     * `gestos.js`, `objetivo_visible.js`, `encuadre.js` y `mandos.js`. Esos cuatro
     * salían con `?v=` y NO contaban para el resumen, o sea que cambiar uno no subía
     * la versión: el fichero se desplegaba y quien ya hubiera abierto una mesa se
     * quedaba con el anterior, sin error en ninguna parte.
     *
     * Lo destapé arreglando el recuadro de «a qué se juega» —que vive justo en
     * `objetivo_visible.js`—: el arreglo no habría llegado a nadie.
     *
     * Es la lista paralela otra vez, y esta vez en la herramienta que existe para
     * cazar desajustes. Ahora se sacan las rutas del propio `montarMesa.js`, así que
     * el día que alguien añada algo al andamio entra solo.
     *
     * ⚠️ «ENTRA SOLO» ERA MENTIRA A MEDIAS: SÓLO SI SE ESCRIBÍA SIN BARRA.
     *
     * El patrón cazaba `'js/…'` y nada más. `montarMesa.js` sella TODO lo que no
     * empiece por `/vendor/`, así que una entrada absoluta —`'/js/sfx.js'`, que es
     * como hay que escribir lo que vive fuera del arcade— salía con `?v=` y NO
     * contaba para el resumen. O sea: editar el motor de sonido no subía la
     * versión, y quien ya hubiera abierto una mesa se quedaba con el sonido
     * anterior emparejado con código nuevo. Es exactamente el fallo que este
     * fichero existe para cazar, escondido en el propio cazador.
     *
     * La misma lección que ya está escrita dos veces aquí arriba, un piso más
     * abajo: no basta con leer la lista, hay que leerla ENTERA.
     */
    const fuente = await readFile(new URL('./montarMesa.js', JS), 'utf-8');
    const delAndamio = [...fuente.matchAll(/'(\/?)js\/([\w./-]+\.m?js)'/g)]
        // `protohub/` se sella igual que el resto: si va con `?v=`, cuenta.
        // Las absolutas viven en `public/js/`, dos pisos por encima de éste.
        .map(m => (m[1] ? `../../js/${m[2]}` : m[2]));
    // Los visualizadores no son una lista: son lo que hay. Una lista escrita aquí
    // se separaría del directorio el día que alguien añada uno.
    const hay = await readdir(JS, { withFileTypes: true });
    const vis = hay.filter(e => e.isFile() && /_visualizer\.js$|^mesa_\w+\.mjs$/.test(e.name))
                   .map(e => e.name);
    return [...new Set([...delAndamio, ...vis])].sort();
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
