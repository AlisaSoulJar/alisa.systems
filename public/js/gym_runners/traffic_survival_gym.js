import { TrafficSurvivalSystem } from '../alisa-engine/src/world/systems/TrafficSurvivalSystem.js';

export async function runGymEpisode(ticks = 2000, WORKER_NAME = "LabRat") {
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
