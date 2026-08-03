import { IDMSystem } from '../alisa-engine/src/world/systems/IDMSystem.js';

export async function runGymEpisode(epochs, WORKER_NAME = "LabRat") {
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
