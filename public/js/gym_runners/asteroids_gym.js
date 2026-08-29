import { AsteroidsSystem } from '../alisa-engine/src/world/systems/AsteroidsSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(steps = 1500, WORKER_NAME = 'NodeGymWorker') {
    console.log(`[${WORKER_NAME}] AsteroidsSystem → RL Pure Headless Interface por ${steps} steps...`);

    const system = new AsteroidsSystem();
    
    // Configura e inicia
    system.start({ stage: 1, shipClass: 'VIPER', asteroidDensity: 10, scrollSpeed: 20 });
    
    const dt = 0.016;
    const t0 = performance.now();
    let totalReward = 0;

    // Simulate training loop
    for (let s = 0; s < steps; s++) {
        if (system.ship && !system.ship.dead) {
            // Random thrust
            const fx = (Math.random() - 0.5) * 50;
            const fy = (Math.random() - 0.5) * 50;
            system.ship.tx += fx * dt;
            system.ship.ty += fy * dt;
            
            // Recompensas basales
            totalReward += 0.1; // sobrevivir
            if (system.stats.graze > 0) {
                totalReward += system.stats.graze * 0.5;
            }
        } else {
            totalReward -= 10; // penalizacion por muerte
            break;
        }

        system.tick(dt);
    }

    const t1 = performance.now();
    const simTimeMs = t1 - t0;
    const tps = steps / (simTimeMs / 1000);
    
    console.log(`[${WORKER_NAME}] Simulación pura Asteroids RL completada en ${Math.round(simTimeMs)}ms (${Math.round(tps)} TPS).`);

    return {
        method: 'Asteroids RL Pure Headless',
        steps,
        total_reward: totalReward,
        final_score: system.stats.score,
        deaths: system.stats.deaths,
        sim_time_ms: simTimeMs,
        tps: tps
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
