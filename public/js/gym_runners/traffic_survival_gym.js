import { TrafficSurvivalSystem } from '../alisa-engine/src/world/systems/TrafficSurvivalSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(ticks = 2000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] TrafficSurvivalSystem → Simulando supervivencia de 10 ranas en tráfico pesado (${ticks} ticks)...`);
    
    const lanes = [
        { z: -12, speed: 15, dir: 1 },
        { z: -4, speed: 10, dir: -1 },
        { z: 4, speed: 12, dir: 1 },
        { z: 12, speed: 18, dir: -1 }
    ];

    // Mismo desfase que en carver_gym: `…Engine` es el nombre viejo.
    const engine = new TrafficSurvivalSystem({ lanes });

    // Populate road
    for (let i = 0; i < 12; i++) {
        const l = lanes[i % 4];
        engine.addCar({
            id: `car_${i}`,
            x: (i * 20) - 100,
            y: 0,
            z: l.z,
            rY: 0,
            dir: l.dir,
            speed: l.speed,
            baseSpeed: l.speed,
            sizeX: 2,
            sizeZ: 4,
            isRaptor: Math.random() < 0.1,
            laneZ: l.z
        });
    }

    // Populate frogs
    for (let i = 0; i < 10; i++) {
        engine.addFrog({
            id: `frog_${i}`,
            x: (i * 10) - 45,
            y: 0,
            z: 20, // Start side
            state: 'wait',
            timer: Math.random()
        });
    }

    const t0 = performance.now();
    for (let i = 0; i < ticks; i++) {
        engine.tick(0.016);
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] Simulación de Tráfico completada en ${Math.round(durationMs)}ms.`);

    return {
        method: "Traffic Survival Headless Simulation",
        ticks: ticks,
        stats: engine.stats,
        surviving_frogs: engine.frogs.length,
        sim_time_ms: durationMs,
        extracted_weights: { signature: "TRAFFIC_SURVIVAL_HEURISTICS_v1" }
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
