import { ChopperAquariumEngine } from '../alisa-engine/src/world/systems/ChopperAquariumEngine.js';

export async function runGymEpisode(ticks = 500) {
    console.log(`[LabRat] ChopperAquariumEngine → Iniciando simulación determinista (Headless) de ${ticks} ticks...`);
    
    const engine = new ChopperAquariumEngine();
    engine.reset(42);

    const t0 = performance.now();
    for (let i = 0; i < ticks; i++) {
        // actionIdx = 0 (no input), dt = 0.016
        engine.stepSimulation(0, 0.016, true);
    }
    const t1 = performance.now();
    
    const obs = engine.getObservationVector();
    
    console.log(`[LabRat] Simulación Chopper ECS completada en ${Math.round(t1 - t0)}ms.`);
    return {
        method: "Chopper ECS Headless RL",
        ticks: ticks,
        sim_time_ms: t1 - t0,
        final_obs: obs
    };
}
