import { BoidsSystem } from '../alisa-engine/src/world/systems/BoidsSystem.js';

export async function runGymEpisode(ticks = 1000, WORKER_NAME = "LabRat") {
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
