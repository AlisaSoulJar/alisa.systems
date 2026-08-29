import { IDMSystem } from '../alisa-engine/src/world/systems/IDMSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(epochs, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] IDMSystem → Inicializando circuito de entrenamiento rápido (${epochs} epocas)...`);
    const engine = new IDMSystem({ 
        desiredSpeed: 20.0,
        safeTimeHeadway: 1.2
    });

    const lanes = [{ z: 0, speed: 10, dir: 1 }];
    const vehicles = [
        { id: "RL-Ego", x: 0, z: 0, dir: 1, speed: 5, baseSpeed: 5, followDist: 15, brakeFactor: 0, braking: false, brakeSensitivity: 2, laneChangeChance: 0 }
    ];

    let totalDistance = 0;
    
    const t0 = performance.now();
    for (let e = 0; e < epochs; e++) {
        const updates = engine.tickMultiLane(vehicles, lanes, [], 0.05); // dt = 50ms
        for (const v of vehicles) {
            const up = updates.find(u => u.id === v.id);
            if (up) {
                v.brakeFactor = up.brakeFactor;
                v.braking = up.braking;
                if (up.braking) {
                    v.speed = Math.max(0, v.speed - (5 * 0.05)); 
                } else {
                    v.speed = Math.min(20, v.speed + (2 * 0.05)); 
                }
                v.x += v.speed * 0.05;
                totalDistance = v.x;
            }
        }
    }
    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] Ticks completos en ${Math.round(durationMs)}ms.`);

    return {
        method: "IDM Traffic Simulation",
        epochs: epochs,
        distanceSailed: totalDistance,
        ego_final_speed: vehicles[0].speed,
        sim_time_ms: durationMs,
        RL_Weights: "MOCK_WEIGHTS_CONVERGED_0.9821_IDM"
    };
}

/**
 * ⚠️ EL EPISODIO CORRE DENTRO DE UN AMBITO DETERMINISTA, Y ANTES NO.
 *
 * Medido el 29-08-2026: este arnes llamaba a `Math.random` sin sembrar, asi que
 * dos ejecuciones daban resultados distintos. Un arnes que no se repite no sirve
 * para comparar a nadie con nadie, que es lo unico que hace este banco.
 *
 * El motor ya tenia la herramienta —`DeterministicScope`, escrita justamente para
 * esto y usada por otros veintiseis ficheros— y los arneses eran los unicos que
 * no la usaban. Sustituye `Math.random` por mulberry32 durante el tramo y lo
 * devuelve a su sitio al salir: cero ediciones en los sistemas de debajo.
 *
 * Se envuelve en vez de tocar el cuerpo a proposito: asi el episodio de siempre
 * se queda como estaba y la unica diferencia es de donde sale el azar.
 */
const SEMILLA = 42;

export async function runGymEpisode(...args) {
    return DeterministicScope.runAsync(SEMILLA, () => _episodio(...args));
}
