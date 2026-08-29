/**
 * prueba_mecha.mjs — ¿es justa la arena, o gana el asiento?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_mecha.mjs        → 0 bien · 1 mal · 2 la prueba no vale
 *
 * POR QUÉ ESTE JUEGO TIENE PRUEBA PROPIA Y OTROS NO
 *
 * `prueba_reglas.mjs` ya comprueba que se juega, se repite y se verifica. Eso
 * vale para los cuarenta. Lo que no vigila nadie es la propiedad que a este le
 * costó tres correcciones seguidas: **que los dos asientos sean el mismo
 * asiento**.
 *
 * Un juego de dos donde uno gana solo no mide jugadores, mide sitios. Y es la
 * clase de avería que no da error, no rompe ninguna partida y sólo se ve
 * contando cien partidas — o sea, exactamente la que se cuela.
 *
 * LAS TRES VECES QUE ESTUVO ROTO, PARA QUE SE ENTIENDA QUÉ VIGILA ESTO:
 *
 *   1. El mundo avanzaba al cerrar la RONDA, así que al asiento 1 le estallaba
 *      todo justo después de mover y el 0 jugaba siempre sobre cenizas frías.
 *      Medido: 36-18 y 39-16 para el 0, empezara quien empezara.
 *   2. El rival de casa recorría las direcciones en orden ABSOLUTO, y en un
 *      tablero girado 180° el «arriba» de uno es el «abajo» del otro. 61 % para
 *      el 0 sobre un mapa demostrablemente simétrico.
 *   3. Y de propina, un diagnóstico equivocado por el camino: culpé al reparto de
 *      cajas, hice el mapa simétrico por construcción, y los cuatro porcentajes
 *      no se movieron ni un dígito. El reflejo se quedó igualmente —ahora ese
 *      sesgo no puede volver por esa puerta— pero no era el que había.
 */
import { mecha, generarMapa, W, H } from './public/arcade/js/protohub/rules/mecha.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const idx = (x, y) => y * W + x;
const espejo = (i) => idx(W - 1 - (i % W), H - 1 - ((i - i % W) / W));

// ── 1. El mapa es el mismo tablero girado 180° ──────────────────────────────
{
    let rotas = 0, celdas = 0;
    for (let seed = 1; seed <= 30; seed++) {
        const m = generarMapa(seed);
        for (let i = 0; i < m.celdas.length; i++) {
            celdas++;
            if (m.celdas[i] !== m.celdas[espejo(i)]) rotas++;
        }
        for (const [i, que] of m.mejoras) {
            comprobaciones++;
            if (m.mejoras.get(espejo(i)) !== que) mal(`semilla ${seed}: una mejora sin su pareja reflejada`);
        }
    }
    comprobaciones++;
    if (rotas) mal(`${rotas} de ${celdas} celdas rompen la simetría del mapa`);

    // ⚠️ CONTROL POSITIVO. Una comparación que siempre da igual no comprueba nada:
    //    se rompe una celda a mano y tiene que verse.
    const m = generarMapa(1);
    const i = m.celdas.findIndex((v, k) => v !== m.celdas[espejo(k)] === false && k % W > 0 && v === 0);
    if (i >= 0) {
        m.celdas[i] = 2;
        comprobaciones++;
        if (m.celdas[i] === m.celdas[espejo(i)]) {
            console.log(rojo('\nCONTROL POSITIVO FALLIDO: se rompió una celda y la comparación no lo ve.\n'));
            process.exit(2);
        }
    }
}

// ── 2. Los dos asientos son el mismo asiento ────────────────────────────────
/**
 * ⚠️ SE JUEGA CADA SEMILLA DOS VECES, CAMBIANDO QUIÉN EMPIEZA.
 *
 * Así la única diferencia entre las dos mitades es el orden de salida, y lo que
 * se cuenta no es «gana el 0» sino «gana quien empieza». Contar victorias del
 * asiento 0 sin cruzar el orden mezcla dos efectos distintos y no distingue una
 * ventaja de salida legítima de un asiento roto: fue justo lo que me despistó.
 */
/**
 * ⚠️ HACEN FALTA LAS DOS CUENTAS, Y LA PRIMERA VERSIÓN SÓLO TENÍA UNA.
 *
 * Escribí sólo «gana quien empieza» y me pareció suficiente. Al romper el módulo
 * a propósito —devolviendo al rival de casa a su orden absoluto de direcciones,
 * que es la avería #2 de la cabecera— la prueba APROBÓ con un 47,1 %.
 *
 * Y tenía que aprobar: esa avería le da ventaja al ASIENTO 0, y como cada semilla
 * se juega con los dos órdenes de salida, al contar «quien empieza» el sesgo se
 * reparte entre las dos mitades y se promedia hasta desaparecer. La métrica que
 * hace justa la comparación es exactamente la que ciega este fallo.
 *
 * Así que se cuentan las dos cosas por separado:
 *
 *   · POR ORDEN   — gana quien empieza: mide la ventaja de salida, legítima.
 *   · POR ASIENTO — gana el 0: sobre las dos mitades juntas tiene que dar 50 %,
 *                   porque el orden ya está cruzado. Si no, el sitio pesa.
 *
 * Una sola de las dos deja pasar la mitad de las averías posibles.
 */
const N = 120;
let empieza = 0, segundo = 0, tablas = 0, sinFin = 0;
let asiento0 = 0, asiento1 = 0;
const largos = [];
for (const e1 of [false, true]) {
    for (let seed = 1; seed <= N; seed++) {
        const p = mecha.nuevaPartida({ seed, tope: 600 });
        if (e1) p.turno = 1;
        let n = 0;
        while (!mecha.estado(p).is_game_over && n < 1400) {
            const m = mecha.sugerencia(p);
            if (!m || !mecha.mover(p, m)) break;
            n++;
        }
        const e = mecha.estado(p);
        largos.push(p.t);
        comprobaciones++;
        if (!e.is_game_over) { sinFin++; continue; }
        if (e.result === 'draw' || e.result === null) { tablas++; continue; }
        const ganador = e.result === 'white' ? 0 : 1;
        if (ganador === (e1 ? 1 : 0)) empieza++; else segundo++;
        if (ganador === 0) asiento0++; else asiento1++;
    }
}

const decisivas = empieza + segundo;
comprobaciones += 3;
if (sinFin) mal(`${sinFin} partidas no llegaron a acabar`);
if (decisivas < N) mal(`sólo ${decisivas} de ${2 * N} partidas fueron decisivas: el juego casi no separa`);

/**
 * ⚠️ LA BANDA ES ANCHA A PROPÓSITO, Y AUN ASÍ HABRÍA CAZADO LAS TRES AVERÍAS.
 *
 * Con 240 partidas, el ruido de una moneda justa anda por ±3 puntos; una banda de
 * ±10 deja sitio a la ventaja de salida legítima —las blancas en ajedrez rondan
 * el 55 %— sin dejar pasar un asiento roto. Los tres fallos que hubo daban 61, 67
 * y 71 %: los tres fuera de banda, y con margen.
 *
 * Estrecharla a ±3 haría que la prueba fallara sola de vez en cuando por azar, y
 * una prueba que falla sin motivo se acaba ignorando, que es peor que no tenerla.
 */
const porcentaje = decisivas ? (100 * empieza) / decisivas : 50;
if (Math.abs(porcentaje - 50) > 10) {
    mal(`quien empieza gana el ${porcentaje.toFixed(1)}% de las decisivas. `
        + `Fuera de la banda 40-60: la ventaja de salida se ha disparado.`);
}

/**
 * ⚠️ Y ÉSTA ES LA QUE CAZA EL ASIENTO ROTO. Como cada semilla se juega con los
 *    dos órdenes de salida, el turno ya está compensado: lo que quede aquí es
 *    del SITIO, y no hay ninguna razón legítima para que un asiento gane más.
 *    Por eso su banda es más estrecha que la del orden.
 */
comprobaciones++;
const porAsiento = decisivas ? (100 * asiento0) / decisivas : 50;
if (Math.abs(porAsiento - 50) > 8) {
    mal(`el asiento 0 gana el ${porAsiento.toFixed(1)}% de las decisivas con el orden ya cruzado. `
        + `Eso no puede ser ventaja de salida: es que el SITIO pesa. Mira si algo recorre `
        + `direcciones, celdas o jugadores en un orden absoluto en vez de en el marco de cada uno.`);
}

// ── 3. Termina, y no por el tope ────────────────────────────────────────────
largos.sort((a, b) => a - b);
comprobaciones += 2;
if (largos.at(-1) >= 600) mal(`alguna partida llegó al tope (${largos.at(-1)}): la arena no se cierra`);
if (largos[Math.floor(largos.length / 2)] < 40) {
    mal(`mediana de ${largos[Math.floor(largos.length / 2)]} jugadas: demasiado corta, se están matando solos`);
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 200;
console.log(`\n¿Es justa la arena, o gana el asiento?\n`);
console.log(gris(`  ${2 * N} partidas · cada semilla con los dos órdenes de salida · ${comprobaciones} comprobaciones`));
console.log(gris(`  quien empieza gana el ${porcentaje.toFixed(1)}% · el asiento 0 gana el ${porAsiento.toFixed(1)}% · `
    + `${tablas} tablas · jugadas ${largos[0]}/${largos[Math.floor(largos.length / 2)]}/${largos.at(-1)}`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${comprobaciones} comprobaciones, mínimo ${MINIMO}.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 8)) console.log(rojo(`  ✗ ${f}`));
    console.log(rojo(`\n✗ ${fallos.length} fallos\n`));
    process.exit(1);
}
console.log(verde('✓ el mapa es el mismo girado, los dos asientos ganan igual, y la arena cierra las partidas\n'));
