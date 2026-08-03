import { EcosystemSystem } from '../alisa-engine/src/world/systems/EcosystemSystem.js';

export async function runGymEpisode(ticks = 2000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] EcosystemSystem → Simulando biosfera acuática (Hunters vs Fishes vs Sharks) por ${ticks} ticks...`);
    
    const engine = new EcosystemSystem();
    const TANK = { width: 100, depth: 100, waterLevel: 40, EAT_RADIUS: 2.0, maxPlankton: 50 };
    
    // Initialize population
    let fishes = Array.from({ length: 30 }, (_, i) => ({
        id: `f_${i}`, x: (Math.random()-0.5)*80, y: 10+Math.random()*20, z: (Math.random()-0.5)*80,
        tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 2, timer: 0, stamina: 100, alive: true, score: 0
    }));
    
    let hunters = Array.from({ length: 5 }, (_, i) => ({
        id: `h_${i}`, x: (Math.random()-0.5)*90, y: 10+Math.random()*20, z: (Math.random()-0.5)*90,
        tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 4, timer: 0, energy: 100, alive: true, score: 0
    }));
    
    let sharks = Array.from({ length: 2 }, (_, i) => ({
        id: `s_${i}`, x: (Math.random()-0.5)*90, y: 5+Math.random()*10, z: (Math.random()-0.5)*90,
        tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 3, timer: 0, alive: true, score: 0
    }));
    
    let plankton = Array.from({ length: 40 }, (_, i) => ({
        id: `p_${i}`, x: (Math.random()-0.5)*95, y: 1+Math.random()*35, z: (Math.random()-0.5)*95,
        baseY: 10, phase: Math.random(), ampY: 5, alive: true
    }));

    const t0 = performance.now();
    for (let i = 0; i < ticks; i++) {
        fishes = engine.tickFishes(fishes, hunters, sharks, plankton, [], [], 0.016, i * 0.016, TANK);
        hunters = engine.tickHunters(hunters, fishes, sharks, [], [], 0.016, i * 0.016, TANK);
        sharks = engine.tickSharks(sharks, hunters, fishes, [], [], 0.016, i * 0.016, TANK);
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    
    const survivors = fishes.filter(f => f.alive).length;
    const feastCount = hunters.reduce((acc, h) => acc + h.score, 0);

    console.log(`[${WORKER_NAME}] Simulación de Ecosistema completada en ${Math.round(durationMs)}ms.`);

    return {
        method: "Ecosystem Biology Headless Simulation",
        ticks: ticks,
        initial_fishes: 30,
        final_survivors: survivors,
        hunter_kill_count: feastCount,
        sim_time_ms: durationMs,
        extracted_weights: { signature: "ECOSYSTEM_BALANCE_VECTOR_v4" }
    };
}
