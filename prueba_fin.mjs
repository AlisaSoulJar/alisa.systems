/**
 * prueba_fin.mjs — ¿dice el banco POR QUÉ se acabó un episodio?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_fin.mjs      → 0 todo bien · 1 hay fallos · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * Un episodio puede acabar por dos razones que no significan lo mismo:
 *
 *   terminado   las reglas dijeron que se acabó — jaque mate, te mataron, no
 *               quedan cartas. El futuro después de ese estado NO EXISTE.
 *   truncado    alguien de fuera cortó — el tope de pasos, un reloj, una cuota.
 *               El juego seguía; sólo dejamos de mirar.
 *
 * A una persona le da igual. A un algoritmo de refuerzo no: al terminar aprende
 * que el valor futuro es cero, y al truncar tiene que seguir estimándolo.
 * Confundirlos le enseña que aguantar hasta el tope es tan malo como morirse —
 * al revés de lo que este banco quiere medir, donde hay juegos de supervivencia
 * y el bueno es el que DURA. Gymnasium partió su `done` en dos en 2022 por esto.
 *
 * QUÉ MIDE, Y SOBRE LOS 53
 *
 *   1. que nunca sean verdad los dos a la vez;
 *   2. que `done` y el porqué digan lo mismo — si el episodio acabó, hay razón,
 *      y si no acabó, no la hay;
 *   3. que un episodio CORTADO POR EL TOPE se declare truncado y no terminado.
 *      Aquí es donde estaba el fallo: cincuenta y dos entornos no truncan nunca
 *      —acaban cuando las reglas lo dicen— y quien truncaba era el bucle de
 *      `runEpisode`, que salía por la puerta sin decirlo;
 *   4. que un episodio acabado POR LAS REGLAS se declare terminado.
 *
 * ⚠️ EL CONTROL POSITIVO NO ES OPCIONAL, Y AQUÍ ES MUY FÁCIL AUTOENGAÑARSE.
 *
 * Una comprobación que sólo mire «no son los dos a la vez» aprueba con los dos
 * en falso SIEMPRE — o sea, con el dato entero perdido, que es exactamente el
 * estado del que venimos. Por eso se exige ver los DOS casos al menos una vez
 * cada uno entre los 53: si en toda la vuelta nadie termina, o nadie trunca, la
 * prueba no vale (2) en vez de aprobar.
 *
 * SABOTAJE DECLARADO
 *   · `runEpisode` vuelve a devolver sólo `done` → esto tiene que decirlo
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registry.js';

const TOPE_CORTO = 3;      // seguro que corta a casi todos
const TOPE_LARGO = 4000;   // suficiente para que los que acaban, acaben

if (CATALOGO.length < 2) {
    console.log(`CONTROL POSITIVO FALLIDO: el catalogo trae ${CATALOGO.length} entornos.`);
    process.exit(2);
}

/**
 * Una política que sólo elige entre lo que el entorno declara legal AHORA.
 *
 * No usa azar: la pregunta de esta prueba es «¿se dice por qué se acabó?», y una
 * política con azar propio haría que dos vueltas acabaran por motivos distintos
 * sin que eso significara nada. Va por turno rotatorio, que es determinista y
 * recorre el menú en vez de encasquillarse en la primera opción.
 */
function politicaDelMenu() {
    let i = 0;
    return (_obs, env) => {
        const v = env.affordances();
        if (!v.length) return null;
        const o = v[i++ % v.length];
        return o.action !== undefined ? o.action : o.verb;
    };
}

console.log(`\n¿Dice el banco por qué se acabó cada episodio?  (${CATALOGO.length} entornos)\n`);

let fallos = 0, vistoTerminado = 0, vistoTruncado = 0, medidos = 0;

for (const entrada of CATALOGO) {
    const problemas = [];
    let nota = '';
    try {
        const Clase = await entrada.cargar();

        // ── largo: que llegue hasta donde las reglas lo dejen ──────────────
        const largo = new Clase().runEpisode(politicaDelMenu(), { seed: 7, maxSteps: TOPE_LARGO });
        if (largo.terminated === undefined || largo.truncated === undefined) {
            problemas.push('el episodio no dice terminated/truncated');
        } else {
            if (largo.terminated && largo.truncated) problemas.push('terminado Y truncado a la vez');
            if (!largo.terminated && !largo.truncated) problemas.push('acabó sin decir por qué');
            if (largo.terminated) vistoTerminado++;
            if (largo.truncated)  vistoTruncado++;
            nota = largo.terminated ? `terminado en ${largo.steps}` : `truncado en ${largo.steps}`;
        }

        // ── corto: cortarlo a propósito y ver si lo confiesa ───────────────
        const corto = new Clase().runEpisode(politicaDelMenu(), { seed: 7, maxSteps: TOPE_CORTO });
        /**
         * ⚠️ SÓLO SI DE VERDAD LE SOBRABA PARTIDA.
         *
         * Un blackjack se acaba en dos jugadas, así que con tope 3 puede terminar
         * de verdad — y exigirle «truncado» sería la prueba equivocándose, no el
         * entorno. Se le exige truncado únicamente si gastó el tope entero, que es
         * la única señal de que el corte fue nuestro.
         */
        if (corto.steps >= TOPE_CORTO) {
            if (!corto.truncated) problemas.push(`cortado a los ${TOPE_CORTO} y no lo dice`);
            if (corto.terminated) problemas.push(`cortado a los ${TOPE_CORTO} y dice que terminó`);
        }

        // ── el entorno, aparte del episodio ────────────────────────────────
        const env = new Clase();
        env.reset(7);
        if (env.terminated || env.truncated) problemas.push('recién reiniciado y ya dice que acabó');

        medidos++;
    } catch (e) {
        problemas.push(`reventó: ${e.message}`);
    }

    if (problemas.length) {
        fallos++;
        console.log(`  ✗ ${entrada.id}`);
        problemas.forEach(p => console.log(`      · ${p}`));
    } else {
        console.log(`  ✓ ${entrada.id.padEnd(34)} ${nota}`);
    }
}

console.log('');
if (!medidos) {
    console.log('CONTROL POSITIVO FALLIDO: no se pudo medir ni un entorno.');
    process.exit(2);
}
if (!vistoTerminado || !vistoTruncado) {
    console.log(`CONTROL POSITIVO FALLIDO: en los ${medidos} medidos se vieron ` +
                `${vistoTerminado} terminados y ${vistoTruncado} truncados. ` +
                `Con uno de los dos a cero, «nunca son los dos a la vez» lo cumple ` +
                `también un banco que perdió el dato entero.`);
    process.exit(2);
}

console.log(`  ${medidos} entornos · ${vistoTerminado} acaban por las reglas · ` +
            `${vistoTruncado} los corta el tope`);
console.log(fallos ? `\n  ✗ ${fallos} con problemas\n`
                   : `\n  ✓ todos dicen por qué se acabó, y nunca las dos cosas\n`);
process.exit(fallos ? 1 : 0);
