/**
 * perfil_jugador.mjs — ¿en QUÉ es bueno cada jugador, y existen las castas?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node perfil_jugador.mjs
 *
 * Cruza dos tablas que ya teníamos y que nunca habíamos juntado:
 *
 *   · `matriz_generos` dice **qué ejes ejercita cada juego** — geometría,
 *     información oculta, decisión simultánea, cooperación…
 *   · `tabla.mjs` dice **cómo le fue a cada jugador en cada juego**, en la escala
 *     normalizada donde 0 es elegir la primera opción y 1 es el rival de la casa.
 *
 * De ahí sale el perfil por ejes de un jugador. La carta astral.
 *
 * ⚠️ Y SIRVE PARA REFUTAR, QUE ES PARA LO QUE SE ESCRIBIÓ.
 *
 * El reparto de huevos por castas —el mejor de cada casilla del mapa de
 * perfiles, no los N primeros de una lista— **descansa en que los ocho ejes
 * separen JUGADORES**. Sabemos que separan juegos; eso está medido. Que separen
 * a quien los juega es otra afirmación, y nadie la ha comprobado.
 *
 * Si resulta que todo el que es bueno en observabilidad parcial lo es también en
 * economía y en comunicación, entonces no hay ocho ejes: hay uno con ocho
 * disfraces, el mapa de perfiles es una recta y el sistema de castas se cae.
 *
 * Vale más descubrirlo con un cruce de tablas que después de construirlo.
 */
import { readFile } from 'node:fs/promises';

const leer = async (r) => JSON.parse(await readFile(new URL(r, import.meta.url), 'utf-8'));

const matriz = await leer('./resultados/matriz.json');
const tabla = await leer('./resultados/tabla.json');

const EJES = Object.keys(matriz.ejes);
const jugadores = tabla.resumen ?? [];
if (!jugadores.length) {
    console.log('  no hay resumen en resultados/tabla.json — corre antes `node tabla.mjs`');
    process.exit(1);
}

/** Mediana, no media: la lección de brisca. Un juego raro no debe mandar. */
const mediana = (xs) => {
    if (!xs.length) return null;
    const o = [...xs].sort((a, b) => a - b);
    return o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2;
};

console.log('\nPerfil por ejes — la carta astral de cada jugador\n');
console.log(`  ${'jugador'.padEnd(22)}${EJES.map(e => e.slice(0, 6).padStart(8)).join('')}${'reparto'.padStart(10)}`);

const perfiles = [];
for (const j of jugadores) {
    const porEje = {};
    for (const eje of EJES) {
        const notas = Object.entries(j.porJuego ?? {})
            .filter(([juego, n]) => n !== null && matriz.juegos[juego]?.[eje] === true)
            .map(([, n]) => n);
        porEje[eje] = notas.length >= 2 ? mediana(notas) : null;
    }
    const vistos = EJES.map(e => porEje[e]).filter(v => v !== null);
    /**
     * ⚠️ EL «REPARTO» ES LA CIFRA QUE DECIDE SI HAY CASTAS.
     *
     * Es cuánto se separan entre sí los ejes de un mismo jugador. Si es pequeño,
     * ese jugador es igual de bueno en todo y su perfil no dice nada — no tiene
     * casta, tiene nivel. Si es grande, tiene forma: es fuerte en unas cosas y
     * flojo en otras, y entonces la casilla del mapa significa algo.
     */
    const reparto = vistos.length >= 2 ? Math.max(...vistos) - Math.min(...vistos) : null;
    perfiles.push({ jugador: j.participante, porEje, reparto });

    console.log(`  ${j.participante.padEnd(22)}`
        + EJES.map(e => (porEje[e] === null ? '—' : porEje[e].toFixed(2)).padStart(8)).join('')
        + (reparto === null ? '—' : reparto.toFixed(2)).padStart(10));
}

// ── ¿existen las castas? ────────────────────────────────────────────────
console.log('\n¿Separan los ejes a los JUGADORES?\n');

const candidatos = perfiles.filter(p => p.reparto !== null && p.jugador !== 'casa (techo blando)');
if (candidatos.length < 1) {
    console.log('  sin datos suficientes.');
} else {
    for (const p of candidatos) {
        const v = EJES.map(e => p.porEje[e]).filter(x => x !== null);
        const alto = EJES.filter(e => p.porEje[e] === Math.max(...v));
        const bajo = EJES.filter(e => p.porEje[e] === Math.min(...v));
        console.log(`  ${p.jugador.padEnd(22)} reparto ${p.reparto.toFixed(2)}`
            + `   mejor: ${alto.join('/')}   peor: ${bajo.join('/')}`);
    }
    /**
     * ⚠️ EL VEREDICTO NO LO DECIDE LA MEDIA, Y LA PRIMERA VERSIÓN SÍ.
     *
     * Promediaba el reparto de todos los participantes y cantaba «hay forma» con
     * 0,34. Debajo de ese número: `qwen2.5:7b`, el único jugador de verdad
     * medido, tenía **0,15 — plano**; y el 0,86 de `azar` salía casi entero de un
     * eje que sostiene **un solo juego**.
     *
     * O sea que un artefacto de una partida cargaba con la conclusión, y encima
     * en la dirección que nos convenía. Es el error que este proyecto lleva todo
     * el día cazando en otros sitios: número correcto, lectura equivocada.
     *
     * Ahora manda el peor caso, no el promedio: si el modelo más plano no tiene
     * forma, no hay castas — por mucho que el azar dibuje una.
     */
    const CASILLAS_MINIMAS = 2;   // juegos por eje para que el eje perfile
    const flacos = EJES.filter(e => Object.values(matriz.juegos)
        .filter(j => j[e] === true).length < CASILLAS_MINIMAS);

    const modelos = candidatos.filter(p => p.jugador !== 'azar' && p.jugador !== 'primera (suelo)');
    console.log('');
    if (flacos.length) {
        console.log(`  ⚠ ${flacos.length} de ${EJES.length} ejes no pueden perfilar a nadie:`);
        console.log(`    ${flacos.join(', ')} — los sostiene menos de ${CASILLAS_MINIMAS} juego(s).`);
        console.log(`    Un eje con un solo juego mide ese juego, no el eje.`);
    }
    if (!modelos.length) {
        console.log(`  Sin ningún modelo en la tanda no se puede responder: las líneas base`);
        console.log(`  no tienen casta —el suelo vale 0 en todo y la casa 1 en todo—.`);
    } else {
        const peor = Math.min(...modelos.map(p => p.reparto));
        console.log(`  reparto del modelo más plano: ${peor.toFixed(2)} (${modelos.length} modelo(s))`);
        console.log(peor < 0.25
            ? `  ⚠ SIN FORMA TODAVÍA. Los ejes no distinguen a este jugador de sí mismo.\n`
            + `    O bien hay UNA dimensión de habilidad con ocho nombres —y el reparto\n`
            + `    por castas no se sostiene—, o bien faltan juegos por eje y modelos\n`
            + `    que comparar. Con los datos de hoy no se puede decidir cuál.`
            : `  ✓ HAY FORMA. Un mismo modelo es claramente mejor en unos ejes que en\n`
            + `    otros, así que la casilla del mapa de perfiles significa algo.`);
    }
    console.log(`\n  Para responder de verdad hacen falta: ≥${CASILLAS_MINIMAS} juegos por eje`);
    console.log(`  y varios modelos distintos. Si todos salieran con la MISMA forma tampoco`);
    console.log(`  habría castas: habría un perfil único del estado del arte — que también`);
    console.log(`  sería un hallazgo, y de los buenos.`);
}

// Y el cruce con `casa` importa: `casa` vale 1.00 en todo por definición, así que
// no aporta forma. Se excluye arriba para que no aplaste la media.
