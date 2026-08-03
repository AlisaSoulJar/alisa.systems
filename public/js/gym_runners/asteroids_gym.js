import { AsteroidsSystem } from '../alisa-engine/src/world/systems/AsteroidsSystem.js';

export async function runGymEpisode(steps = 1500, WORKER_NAME = 'NodeGymWorker') {
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
