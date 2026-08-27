/**
 * prueba_tras_el_final.mjs — ¿defiende cada juego su propio final?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_tras_el_final.mjs   → 0 todo bien · 1 hay fallos · 2 no vale
 *
 * POR QUÉ EXISTE
 *
 * La tesis del banco es que la puntuación no se envía: se recalcula re-jugando
 * la partida. Eso deja la integridad apoyada en una pregunta muy concreta —
 * **¿puede alguien seguir jugando DESPUÉS del final?**— porque si puede, manda
 * una partida que termina y sigue, y el resultado se recalcula desde una
 * posición que no debería existir.
 *
 * Hasta el 28-08-2026 la respuesta era «no, porque los llamantes lo comprueban».
 * `functions/api/gym.js` y `Verificador.js` miran `is_game_over` antes de cada
 * jugada re-simulada, así que colaba nada. Pero eso es la integridad apoyada en
 * que dos ficheros se acuerden, no en la regla: cualquier tercer camino que
 * llame a `mover()` —una sala compartida, un lab, un motor nuevo— se saltaría el
 * final sin enterarse.
 *
 * Medido, treinta y ocho de cuarenta ya se defendían solos. Los dos que no:
 *
 *   go       una piedra después de dos pases colaba Y ponía `pasesSeguidos = 0`,
 *            o sea que RESUCITABA la partida terminada. Se podía continuar un go
 *            acabado hasta dejar el tablero como uno quisiera.
 *   dominó   un `pasar` colaba con la partida trancada. No revive nada, pero es
 *            el mismo agujero.
 *
 * QUÉ MIDE
 *
 * Juega cada juego hasta que termine y entonces le pide que mueva: las que eran
 * legales justo antes, más un par de comodines. Ninguna puede colar.
 *
 * ⚠️ EL CONTROL POSITIVO. Un juego que no llegue a terminar no dice nada sobre
 * esto, y si no terminara NINGUNO la prueba aprobaría sin haber preguntado nada.
 * Por eso se exige que la mayoría acabe de verdad; si no, sale 2.
 *
 * SABOTAJE DECLARADO
 *   · se le quita al go la guardia de los dos pases → esto tiene que decirlo
 */
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';

const TOPE = 4000;
const accionesDe = (st) =>
    (st.legal_moves ?? st.legal_actions ?? []).filter(m => m !== 'nueva' && m !== 'reset');

console.log(`\n¿Defiende cada juego su propio final?  (${JUEGOS.length} juegos)\n`);

let fallos = 0, acabaron = 0, rotos = 0;

for (const juego of JUEGOS) {
    try {
        const reglas = await cargarReglas(juego, {});
        const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
        let ultimas = [], acabo = false;
        for (let i = 0; i < TOPE; i++) {
            const st = reglas.estado(p);
            if (st.is_game_over) { acabo = true; break; }
            const a = accionesDe(st);
            if (!a.length) { acabo = true; break; }
            ultimas = a;
            if (!reglas.mover(p, a[i % a.length])) break;
        }
        if (!acabo) {
            console.log(`  · ${juego.padEnd(12)} no terminó en ${TOPE} jugadas — no dice nada`);
            continue;
        }
        acabaron++;

        /**
         * Se prueban las que ERAN legales justo antes del final, que son las que
         * un tramposo tiene a mano, más `nueva` y `pasar`, que son los dos verbos
         * que más veces se cuelan por caminos aparte.
         */
        const intentos = [...ultimas.slice(0, 6), 'nueva', 'pasar'];
        const colada = intentos.find(j => {
            try { return reglas.mover(p, j) === true; } catch { return false; }
        });

        if (colada) {
            fallos++;
            console.log(`  ✗ ${juego.padEnd(12)} acepta «${colada}» con la partida ya terminada`);
        } else {
            console.log(`  ✓ ${juego.padEnd(12)} refuta todo después del final`);
        }
    } catch (e) {
        rotos++;
        fallos++;
        console.log(`  ✗ ${juego.padEnd(12)} reventó: ${e.message}`);
    }
}

console.log('');
if (acabaron < JUEGOS.length / 2) {
    console.log(`CONTROL POSITIVO FALLIDO: sólo ${acabaron} de ${JUEGOS.length} llegaron a terminar. ` +
                `Sin partidas terminadas esta prueba no ha preguntado nada.`);
    process.exit(2);
}

console.log(`  ${acabaron} partidas terminadas de verdad`);
console.log(fallos ? `\n  ✗ ${fallos} juego(s) se pueden seguir jugando después del final\n`
                   : `\n  ✓ ninguno se deja jugar después de haber terminado\n`);
process.exit(fallos ? 1 : 0);
