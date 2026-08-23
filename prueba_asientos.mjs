/**
 * UN ASIENTO DICE LO QUE CONTIENE, Y ESO TIENE QUE CUADRAR
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_asientos.mjs
 *
 * `asientos` es la cuarta estructura del sustrato y se argumenta en la cabecera
 * de `sustrato.js`: un sitio declarado que contiene algo y que puedes haber
 * mirado ya. Lo inventaron cinco sistemas de esta casa por separado antes de que
 * el vocabulario pudiera decirlo.
 *
 * Lo que vigila esto es que un asiento no MIENTA, y hay tres formas de mentir y
 * las tres son mudas:
 *
 *   1. decir que contiene lo que no contiene — si `cuantas` no cuadra con el
 *      estado del juego, la pantalla enseña un número y el árbitro juega con
 *      otro, y gana el árbitro sin que nadie se entere;
 *   2. perder o fabricar contenido al moverlo — en mancala las semillas se
 *      siembran de hoyo en hoyo y NUNCA se crean ni se destruyen: son 48 desde el
 *      principio hasta el final. Un fallo de siembra que pierda una no da error,
 *      da una partida más corta;
 *   3. cambiar de identidad — si un asiento se renombra entre turnos, deja de
 *      ser el mismo sitio y nada que lo siga puede funcionar.
 *
 * La segunda es la que de verdad protege: es una LEY del juego, no una opinión
 * sobre la estructura de datos, y por eso una implementación rota no puede
 * pasarla por casualidad.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas, JUEGOS } = await impo('public/arcade/js/protohub/rules/index.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('\nUn asiento dice lo que contiene, y eso tiene que cuadrar\n');
const fallos = [];

// ── 1. Quién los usa, y con qué forma ──
const conAsientos = [];
for (const juego of JUEGOS) {
    let R;
    try { R = await cargarReglas(juego, {}); } catch { continue; }
    if (typeof R.sustrato !== 'function') continue;
    let s;
    try { s = R.sustrato(R.nuevaPartida({ semilla: 3 }), 0); } catch { continue; }
    if (!Array.isArray(s?.asientos) || !s.asientos.length) continue;
    conAsientos.push(juego);

    for (const a of s.asientos) {
        if (a.id === undefined) fallos.push(`${juego}: un asiento sin id`);
        if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) fallos.push(`${juego}: asiento «${a.id}» sin posición`);
        // `cuantas` y `tiene` son las dos caras del contenido. Llevar las dos a la
        // vez es decir dos cosas del mismo hueco, y una de ellas sobra.
        if (a.cuantas !== undefined && a.tiene !== undefined) {
            fallos.push(`${juego}: el asiento «${a.id}» lleva \`cuantas\` Y \`tiene\`: son las dos caras del mismo campo`);
        }
    }
    const ids = s.asientos.map((a) => a.id);
    if (new Set(ids).size !== ids.length) fallos.push(`${juego}: dos asientos con el mismo id`);
}

if (!conAsientos.length) {
    fallos.push('ningún juego publica `asientos`: o se deshizo el trabajo, o esta comprobación busca mal');
} else {
    console.log(`  ${verde('✓')} ${conAsientos.length} juego(s) publican asientos con id, posición y una sola cara`
        + gris(` (${conAsientos.join(', ')})`));
}

/**
 * ── 2. ⚠️ LA QUE PROTEGE DE VERDAD: LAS SEMILLAS NO SE CREAN NI SE DESTRUYEN ──
 *
 * En mancala hay 48 semillas —doce hoyos de cuatro— y la siembra las mueve de
 * sitio, nunca las inventa ni las pierde. Es una ley del juego, así que sirve de
 * piedra de toque para los asientos: si su suma se desvía en cualquier momento de
 * una partida entera, o mienten los asientos o está rota la siembra.
 *
 * Lo importante es que se comprueba a lo largo de TODA la partida, no al empezar:
 * una implementación que pierda una semilla al capturar sale bien en la primera
 * foto y mal en la novena.
 */
{
    const R = await cargarReglas('mancala', {});
    const p = R.nuevaPartida({ semilla: 3 });
    const TOTAL = R.sustrato(p, 0).asientos.reduce((t, a) => t + a.cuantas, 0);
    let jugadas = 0, roto = null;
    for (let i = 0; i < 300; i++) {
        const st = R.estado(p);
        if (st.is_game_over) break;
        const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length || !R.mover(p, R.sugerencia?.(p) ?? leg[0])) break;
        jugadas++;
        const suma = R.sustrato(p, 0).asientos.reduce((t, a) => t + a.cuantas, 0);
        if (suma !== TOTAL) { roto = `tras ${jugadas} jugadas hay ${suma} y había ${TOTAL}`; break; }
    }
    if (TOTAL !== 48) fallos.push(`mancala empieza con ${TOTAL} semillas y son 48: los asientos no leen el tablero`);
    else if (roto) fallos.push(`mancala pierde o fabrica semillas: ${roto}`);
    else console.log(`  ${verde('✓')} las 48 semillas de mancala se conservan durante toda la partida`
        + gris(` (${jugadas} jugadas)`));
}

// ── 3. Y los asientos no se renombran ──
{
    const R = await cargarReglas('mancala', {});
    const p = R.nuevaPartida({ semilla: 3 });
    const antes = new Set(R.sustrato(p, 0).asientos.map((a) => a.id));
    for (let i = 0; i < 40; i++) {
        const st = R.estado(p);
        if (st.is_game_over) break;
        const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length || !R.mover(p, R.sugerencia?.(p) ?? leg[0])) break;
    }
    const despues = new Set(R.sustrato(p, 0).asientos.map((a) => a.id));
    const nuevos = [...despues].filter((x) => !antes.has(x));
    const idos = [...antes].filter((x) => !despues.has(x));
    if (nuevos.length || idos.length) {
        fallos.push(`mancala cambió sus asientos a mitad de partida: +${nuevos.join(',')} −${idos.join(',')}`);
    } else console.log(`  ${verde('✓')} los asientos son los mismos al principio y al final`
        + gris(` (${antes.size} hoyos y graneros)`));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ los asientos dicen la verdad sobre lo que contienen\n'));
