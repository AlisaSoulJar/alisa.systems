/**
 * semillas.mjs — las semillas no las elige quien juega
 * ═══════════════════════════════════════════════════════════════════════════
 *     node semillas.mjs                  → las de hoy, los 41 juegos
 *     node semillas.mjs mecha            → la de mecha hoy
 *     node semillas.mjs mecha 2026-08-30 → la de mecha ese día
 *
 * ⚠️ EL AGUJERO QUE CIERRA, Y ES EL MÁS BARATO DE TODOS.
 *
 * `docs/cuando_los_puntos_valen_algo.md` lo dejó escrito el 08-08-2026 y nadie lo
 * implementó:
 *
 *     «Semillas emitidas — el agujero más grande y el más barato de cerrar. Hoy,
 *      quien corre el banco elige sus semillas: juega cien y manda las tres
 *      mejores. LA SELECCIÓN ES LA TRAMPA.»
 *
 * Y no necesita ningún truco: `acreditar.mjs --semilla <la que quieras>`. Nadie
 * miente en el recibo —se re-simula y cuadra— y aun así la nota no significa nada,
 * porque mide el mejor de cien intentos contra el promedio de las políticas ciegas
 * en ese mismo mundo.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ POR QUÉ **UNA** SEMILLA POR JUEGO Y PERIODO, Y NO UN CONJUNTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La primera versión de esta idea publicaba N semillas al día. **No sirve de nada:**
 * si hay diez en juego, corres las diez y mandas la mejor. Es exactamente la misma
 * trampa con un conjunto más pequeño.
 *
 * Lo que mata la selección no es que las semillas estén publicadas —tienen que
 * estarlo, o nadie podría comprobar nada— sino que **no haya entre cuáles elegir**.
 * Con una sola por juego y periodo, la única decisión que te queda es jugar mejor.
 *
 * ⚠️ Y REINTENTAR LA MISMA SEMILLA SÍ VALE, A PROPÓSITO.
 *
 * Puedes jugar hoy la de mecha cuarenta veces y mandar tu mejor intento. Eso no es
 * la trampa: es entrenar sobre un problema fijo, es igual para todo el mundo, y es
 * lo que hace cualquiera que quiera jugar bien. Lo que estaba roto era elegir SOBRE
 * QUÉ PROBLEMA te miden, no cuántas veces lo intentas.
 *
 * ⚠️ POR QUÉ LA FECHA Y NO EL HASH DE UN BLOQUE.
 *
 * El diseño de agosto decía «que las semillas salgan del hash del último bloque,
 * para que ni siquiera la casa las elija». Es mejor —es impredecible— y hoy no se
 * puede: no hay ninguna cadena corriendo (`alisa-chain/artifacts` no existe, los
 * contratos no se han compilado nunca).
 *
 * La fecha da la propiedad que hace falta HOY —nadie elige, y cualquiera puede
 * recomputarla— y no da la que falta —impredecibilidad—. Se dice en voz alta en vez
 * de fingirla: quien quiera puede calcular la semilla de mañana y prepararla. Para
 * eso está `desde`: el día que haya cadena, se cambia la fuente y la forma de todo
 * lo demás no se toca.
 *
 * ⚠️ Y EL GENERADOR SE IMPORTA, NO SE COPIA.
 *
 * `prueba_azar.mjs` cuenta los ficheros que copian `mulberry32` en vez de
 * importarlo, y tiene techo. La primera vez que alguien lo copió fue en el DQN, y
 * la prueba lo cazó con esta frase: «impórtalo de DeterministicScope.js, no subas
 * el techo». Dos copias de un generador se separan igual que dos copias de una
 * lista.
 */
import { createHash } from 'node:crypto';
import { JUEGOS } from './public/arcade/js/protohub/rules/index.js';

/**
 * De dónde sale el azar de la emisión. Hoy es la fecha UTC; el día que haya una
 * cadena, el hash del último bloque. Se declara aquí para que el cambio sea de una
 * línea y para que quede escrito qué propiedad tiene cada fuente.
 */
export const FUENTE = {
    nombre: 'fecha-utc',
    predecible: true,
    nota: 'Cualquiera puede calcular la semilla de mañana. Cuando haya cadena, '
        + 'cambiar por el hash del último bloque: eso la hace impredecible.',
};

/** El periodo de hoy, en UTC. Un día. */
export const periodoActual = (ahora = new Date()) => ahora.toISOString().slice(0, 10);

/**
 * La semilla emitida para un juego en un periodo. Determinista y recomputable por
 * cualquiera: eso es lo que la hace comprobable sin confiar en el servidor.
 *
 * Se toman 8 dígitos hexadecimales del sha256 y se acotan a 2^31, que es el rango
 * que aceptan `nuevaPartida({semilla})` y `mulberry32` sin sorpresas.
 */
export function semillaDe(juego, periodo = periodoActual()) {
    const h = createHash('sha256').update(`alisa:${periodo}:${juego}`).digest('hex');
    return parseInt(h.slice(0, 8), 16) % 2147483647;
}

/** ¿Esta semilla estaba emitida para este juego, hoy o en los últimos `dias`? */
export function estaEmitida(juego, semilla, dias = 7, ahora = new Date()) {
    const n = Number(semilla);
    for (let i = 0; i < dias; i++) {
        const d = new Date(ahora.getTime() - i * 86400000);
        if (semillaDe(juego, periodoActual(d)) === n) return { emitida: true, periodo: periodoActual(d) };
    }
    return { emitida: false, periodo: null };
}

// ── como programa ───────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`
    || process.argv[1]?.endsWith('semillas.mjs')) {
    const [juego, periodo = periodoActual()] = process.argv.slice(2);
    if (juego && !JUEGOS.includes(juego)) {
        console.log(`\n«${juego}» no está. Los ${JUEGOS.length}: ${JUEGOS.join(', ')}\n`);
        process.exit(2);
    }
    console.log(`\nSemillas emitidas · ${periodo} · fuente: ${FUENTE.nombre}`);
    console.log(`⚠️ ${FUENTE.nota}\n`);
    for (const j of (juego ? [juego] : JUEGOS)) {
        console.log(`  ${j.padEnd(13)} ${semillaDe(j, periodo)}`);
    }
    console.log('');
}
