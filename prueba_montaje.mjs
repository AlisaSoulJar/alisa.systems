/**
 * prueba_montaje.mjs — ¿cae cada vista donde dice la disposición?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_montaje.mjs      → 0 bien · 1 mal · 2 la prueba no vale
 *
 * ⚠️ UNA REJILLA NO PUEDE DETECTAR UN EJE INVERTIDO, Y CASI ME PILLA.
 *
 * El léxico cuenta las celdas desde ARRIBA (convenio de la pantalla) y
 * `setViewport` cuenta desde ABAJO (convenio de OpenGL), así que hay que voltear.
 * Lo natural es probarlo con `grid_4`, que es la disposición más vistosa.
 *
 * Y sería inútil: `grid_4` y `cctv_2x2` son SIMÉTRICOS arriba-abajo. Volteados se
 * ven exactamente igual, celda por celda. Una prueba escrita sobre ellos aprueba
 * con el eje invertido y con el eje correcto, que es lo mismo que no probar nada.
 *
 * Los que delatan son `split_2h` —«uno encima de otro»— y `pip`, cuya ventanita
 * está en una esquina concreta. Por eso la prueba se apoya en ésos, y por eso el
 * sabotaje declarado quita el volteo.
 *
 * No hace falta three.js: el renderizador se sustituye por uno de mentira que
 * apunta lo que le piden. Se mide la ORDEN, no el píxel.
 */
import { readFile } from 'node:fs/promises';
import { celdasEnPixeles, pintarMontaje, plazasDe, revisarCeldas }
    from './public/arcade/js/protohub/render/montaje.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const LEX = JSON.parse(await readFile('./public/data/realizacion/montaje_lexicon.json', 'utf8'));
const ANCHO = 1280, ALTO = 720;

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const nombres = Object.keys(LEX.layouts ?? {});
if (nombres.length < 5) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${nombres.length} disposiciones en el léxico. `
        + `Con el léxico vacío todo lo de abajo aprueba solo.\n`));
    process.exit(2);
}

// ── 1. EL VOLTEO, medido donde se nota ──────────────────────────────────────
{
    const [arriba, abajo] = celdasEnPixeles(LEX.layouts.split_2h.cells, { ancho: ANCHO, alto: ALTO });
    comprobaciones += 3;
    // La celda 0 se describe como la de arriba: en píxeles de three eso es la Y alta.
    if (!(arriba.y > abajo.y)) {
        mal(`«split_2h» pone «uno encima de otro» y la primera celda sale abajo: `
            + `y=${arriba.y} contra y=${abajo.y}. El eje está sin voltear.`);
    }
    if (arriba.y !== ALTO / 2) mal(`la mitad de arriba debería empezar en ${ALTO / 2} y empieza en ${arriba.y}`);
    if (abajo.y !== 0) mal(`la mitad de abajo debería empezar en 0 y empieza en ${abajo.y}`);

    // `pip`: la ventanita va abajo a la derecha.
    const [, ventana] = celdasEnPixeles(LEX.layouts.pip.cells, { ancho: ANCHO, alto: ALTO });
    comprobaciones += 2;
    if (!(ventana.x > ANCHO / 2)) mal(`la ventana del «pip» debería ir a la derecha y sale en x=${ventana.x}`);
    if (!(ventana.y < ALTO / 2)) mal(`la ventana del «pip» debería ir abajo y sale en y=${ventana.y}`);
}

// ⚠️ CONTROL POSITIVO DEL INSTRUMENTO. Si una rejilla simétrica bastara para ver
//    el volteo, todo lo de arriba sobraría. Se comprueba que NO basta: volteada a
//    mano, `grid_4` da exactamente el mismo conjunto de celdas.
{
    const g = LEX.layouts.grid_4.cells;
    const volteada = g.map((c) => ({ ...c, y: 1 - c.y - c.h }));
    const clave = (l) => l.map((c) => `${c.x},${c.y},${c.w},${c.h}`).sort().join('|');
    comprobaciones++;
    if (clave(g) !== clave(volteada)) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: se suponía que `grid_4` es simétrica arriba-abajo '
            + 'y resulta que no. Entonces el aviso de esta prueba está mal escrito.\n'));
        process.exit(2);
    }
}

// ── 2. Las celdas embaldosan sin costura ────────────────────────────────────
/**
 * ⚠️ `grid_6` reparte 0.333 / 0.334 / 0.333. Redondeando cada ancho por separado
 *    salen tres columnas de 426 px en 1280 y quedan dos píxeles sin pintar: una
 *    línea negra vertical que parece un fallo del material y es un redondeo.
 */
for (const [nombre, lay] of Object.entries(LEX.layouts)) {
    const rects = celdasEnPixeles(lay.cells, { ancho: ANCHO, alto: ALTO });
    comprobaciones += 2;
    if (rects.some((r) => r.w <= 0 || r.h <= 0)) mal(`«${nombre}» tiene celdas de tamaño cero`);
    if (rects.some((r) => r.x < 0 || r.y < 0 || r.x + r.w > ANCHO || r.y + r.h > ALTO)) {
        mal(`«${nombre}» se sale del lienzo`);
    }
    // El área cubierta tiene que dar el lienzo entero, salvo donde se solapa a propósito.
    const { solapa } = revisarCeldas(lay.cells);
    if (!solapa) {
        comprobaciones++;
        const area = rects.reduce((t, r) => t + r.w * r.h, 0);
        if (area !== ANCHO * ALTO) {
            mal(`«${nombre}» cubre ${area} px² de ${ANCHO * ALTO}: faltan ${ANCHO * ALTO - area} por redondeo`);
        }
    }
}

// Y en un lienzo con lados feos, que es donde el redondeo muerde.
for (const [ancho, alto] of [[1366, 633], [391, 844], [1000, 1000], [1281, 721]]) {
    const rects = celdasEnPixeles(LEX.layouts.grid_6.cells, { ancho, alto });
    comprobaciones++;
    const area = rects.reduce((t, r) => t + r.w * r.h, 0);
    if (area !== ancho * alto) mal(`«grid_6» en ${ancho}×${alto} deja ${ancho * alto - area} px² sin cubrir`);
}

// ── 3. El adaptador da las órdenes en el orden correcto ─────────────────────
function renderDeMentira() {
    const diario = [];
    return {
        diario,
        setScissorTest: (v) => diario.push(['recorte', v]),
        setViewport: (x, y, w, h) => diario.push(['viewport', x, y, w, h]),
        setScissor: (x, y, w, h) => diario.push(['scissor', x, y, w, h]),
        render: (e, c) => diario.push(['pinta', e.nombre, c.nombre]),
    };
}
{
    const r = renderDeMentira();
    const vistas = [0, 1, 2, 3].map((i) => ({
        escena: { nombre: `escena${i}` },
        camara: { nombre: `cam${i}`, aspect: 1, updateProjectionMatrix() { this.actualizada = true; } },
    }));
    const n = pintarMontaje(r, LEX.layouts.grid_4.cells, vistas, { ancho: ANCHO, alto: ALTO });

    comprobaciones += 5;
    if (n !== 4) mal(`debería pintar 4 vistas y dice ${n}`);
    if (r.diario.filter((l) => l[0] === 'pinta').length !== 4) mal('no ha pintado cuatro veces');
    if (r.diario[0][0] !== 'recorte' || r.diario[0][1] !== true) mal('no enciende el recorte antes de nada');

    /**
     * ⚠️ Y LO APAGA AL SALIR. El donante nunca dibujaba a pantalla completa, así
     *    que se dejaba el recorte puesto y no le pasaba nada. Si esto lo dejara
     *    encendido, el siguiente dibujo normal saldría recortado al último
     *    cuadrante — sin error, sin motivo aparente, y a saber cuándo se
     *    descubre.
     */
    const ultimos = r.diario.slice(-3);
    if (!ultimos.some((l) => l[0] === 'recorte' && l[1] === false)) mal('no apaga el recorte al terminar');
    const vueltaEntera = r.diario.filter((l) => l[0] === 'viewport'
        && l[1] === 0 && l[2] === 0 && l[3] === ANCHO && l[4] === ALTO);
    if (!vueltaEntera.length) mal('no devuelve el lienzo entero al terminar');

    // La proporción de la celda, no la de la ventana.
    comprobaciones++;
    if (Math.abs(vistas[0].camara.aspect - (ANCHO / 2) / (ALTO / 2)) > 1e-9) {
        mal(`la cámara debería tomar la proporción de su celda y tiene ${vistas[0].camara.aspect}`);
    }
}

// Menos vistas que celdas: se pintan las que hay, sin reventar.
{
    const r = renderDeMentira();
    const n = pintarMontaje(r, LEX.layouts.grid_6.cells,
        [{ escena: { nombre: 'a' }, camara: { nombre: 'c' } }], { ancho: ANCHO, alto: ALTO });
    comprobaciones += 2;
    if (n !== 1) mal(`una vista en seis celdas debería pintar 1 y pinta ${n}`);
    if (plazasDe(LEX.layouts.grid_6.cells) !== 6) mal('grid_6 no dice que tiene seis plazas');
}

// ── 4. El revisor sabe decir que no ─────────────────────────────────────────
{
    comprobaciones += 3;
    if (revisarCeldas(LEX.layouts.grid_4.cells).quejas.length) mal('una rejilla buena se queja');
    if (!revisarCeldas([{ x: 0, y: 0, w: 2, h: 1 }]).quejas.length) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: el revisor aprueba una celda que se sale del cuadro.\n'));
        process.exit(2);
    }
    if (!revisarCeldas(LEX.layouts.pip.cells).solapa) mal('el «pip» solapa a propósito y el revisor no lo ve');
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 30;
console.log(`\n¿Cae cada vista donde dice la disposición?\n`);
console.log(gris(`  ${nombres.length} disposiciones · ${comprobaciones} comprobaciones · `
    + `probado en 1280×720, 1366×633, 391×844, 1000×1000 y 1281×721`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${comprobaciones} comprobaciones, mínimo ${MINIMO}.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 12)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 12) console.log(gris(`  … y ${fallos.length - 12} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos\n`));
    process.exit(1);
}
console.log(verde('✓ las siete disposiciones embaldosan sin costura y con el eje en su sitio\n'));
