import { SimonSaysSystem } from '../alisa-engine/src/world/systems/SimonSaysSystem.js';

export async function runGymEpisode(rounds = 500, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] SimonSaysSystem → Reactive Pattern Matching (Headless RL) por ${rounds} rondas...`);

    const engine = new SimonSaysSystem({
        actionTimeLimit: 2.0,
        tileTimeLimit: 3.0,
        tileChance: 0.4,
        cooldownAfterHit: 0.3,
        cooldownAfterMiss: 0.5,
        gridSize: 5
    });

    // Seeded PRNG
    let seed = 42;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    let state = engine.createState();
    engine.start(state, rng);

    const dt = 0.016;
    const t0 = performance.now();
    let totalTicks = 0;

    for (let r = 0; r < rounds; r++) {
        // Simular hasta que aparece un target o se agota el tiempo
        for (let step = 0; step < 300; step++) {
            engine.tick(state, dt, rng);
            totalTicks++;

            if (state.currentTarget && state.cooldown <= 0) {
                // Agente reactivo: 70% acierta, 30% falla (para entrenar reward shaping)
                if (rng() < 0.7) {
                    engine.submitAction(state, state.currentTarget);
                } else {
                    // Acción incorrecta aleatoria
                    const wrongAction = engine.actionPool[Math.floor(rng() * engine.actionPool.length)];
                    engine.submitAction(state, wrongAction);
                }
                break;
            }
        }
    }

    const t1 = performance.now();
    const obs = engine.getObservation(state);

    console.log(`[${WORKER_NAME}] Simulación SimonSays completada en ${Math.round(t1 - t0)}ms. Score: ${obs.score}`);

    return {
        method: "SimonSays Reactive Pattern Matching",
        rounds,
        total_ticks: totalTicks,
        hits: state.hits,
        misses: state.misses,
        score: obs.score,
        accuracy: state.hits / Math.max(1, state.hits + state.misses),
        sim_time_ms: t1 - t0
    };
}
