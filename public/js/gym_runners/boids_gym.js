import { BoidsSystem } from '../alisa-engine/src/world/systems/BoidsSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(ticks = 1000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] BoidsSystem → Simulando enjambre de 50 boids por ${ticks} ticks...`);
    
    const engine = new BoidsSystem({
        maxSpeed: 3.0,
        maxForce: 0.1
    });

    // Initialize flock
    const bounds = { minX: -20, maxX: 20, minY: 0, maxY: 0, minZ: -20, maxZ: 20 };
    engine.initAgents(50, bounds);

    const t0 = performance.now();
    
    // Convergence metric: average distance to center of mass
    let lastAvgCohesion = 0;

    for (let i = 0; i < ticks; i++) {
        engine.flock = engine.tick(engine.flock, null, null, 0.016);
        
        if (i === ticks - 1) {
            let cx = 0, cz = 0;
            engine.flock.forEach(b => { cx += b.position.x; cz += b.position.z; });
            cx /= engine.flock.length;
            cz /= engine.flock.length;
            
            let distToCenter = 0;
            engine.flock.forEach(b => {
                distToCenter += Math.hypot(b.position.x - cx, b.position.z - cz);
            });
            lastAvgCohesion = distToCenter / engine.flock.length;
        }
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] Simulación de Enjambre completada en ${Math.round(durationMs)}ms.`);

    return {
        method: "Boids Flocking Headless Simulation",
        ticks: ticks,
        agent_count: engine.flock.length,
        final_avg_cohesion: lastAvgCohesion,
        sim_time_ms: durationMs,
        extracted_weights: "BOIDS_CONVERGENCE_VECTOR_SCATTER_0.42"
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
