/**
 * chopper_aquarium_gym.js — el acuario del helicóptero, sin pantalla
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ NO CONTABA COMO ARNÉS
 * Este fichero era un SCRIPT SUELTO: todo el cuerpo estaba al nivel del módulo,
 * así que corría con sólo importarlo y no exportaba nada. Los otros 21 hermanos
 * exportan `runGymEpisode(pasos, nombre)`; éste no, y por eso quedaba fuera de
 * cualquier ejecución automática. Además llamaba a `process.exit(1)`, que en un
 * navegador no existe.
 *
 * Ahora sigue el mismo contrato que el resto: se importa sin efectos y devuelve
 * métricas cuando lo llamas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { ChopperAquariumEngine } from '../alisa-engine/src/world/systems/ChopperAquariumEngine.js';

const DT = 0.016;   // 60 fotogramas por segundo

/** Mulberry32: el mismo generador que el resto del gym, para poder repetir. */
function aleatorio(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export async function runGymEpisode(pasos = 5000, WORKER_NAME = 'LabRat', semilla = 42) {
    const engine = new ChopperAquariumEngine();
    engine.reset(semilla);

    // Política tonta pero REPETIBLE: `Math.random()` haría que dos ejecuciones
    // con la misma semilla dieran números distintos, y entonces la métrica no
    // sirve para comparar nada.
    const rnd = aleatorio(semilla);

    const t0 = performance.now();
    let recompensa = 0, dados = 0, terminado = false, sinObservacion = 0;

    for (let i = 0; i < pasos; i++) {
        const accion = Math.floor(rnd() * 9);          // el espacio es [0..8]
        const r = engine.stepSimulation(accion, DT, true);

        recompensa += r.reward;
        dados++;
        if (!r.obs?.obs) sinObservacion++;             // se cuenta, no se aborta
        if (r.done) { terminado = true; break; }
    }

    return {
        method: 'Chopper Aquarium Headless Simulation',
        pasos: dados,
        semilla,
        recompensa_total: Number(recompensa.toFixed(3)),
        terminado_antes: terminado,
        combustible_final: engine.gameState?.fuel ?? null,
        pasos_sin_observacion: sinObservacion,
        sim_time_ms: Number((performance.now() - t0).toFixed(2)),
    };
}
