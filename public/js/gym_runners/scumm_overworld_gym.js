// Misma herida que en chopper_aquarium_gym: la ruta apuntaba a dónde estaba el
// motor antes de la reorganización, no a dónde está.
import { ScummOverworldEngine } from '../alisa-engine/src/world/systems/ScummOverworldEngine.js';

export function runGymEpisode(WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] Validating ScummOverworldEngine (Headless Croupier Integration)...`);

    const engine = new ScummOverworldEngine();
    
    // Test 1: Initial State Validation
    let q = engine.state.queen;
    if (q.x !== 400 || q.y !== 200) {
        throw new Error("❌ Fallo en estado inicial.");
    }

    // Test 2: Kinematic update
    // Target is exactly 100 pixels right
    engine.setTargetPosition(500, 200);
    
    // dt of 0.5s at speed 300px/s = 150px movement (capped at 100px dist)
    engine.update(0.5);
    
    if (engine.state.queen.x !== 500) {
        throw new Error(`❌ Fallo cinemático. X esperado: 500, X actual: ${engine.state.queen.x}`);
    }

    // Test 3: Verb Resolution to Object (THRONE is at 100, 150)
    engine.setVerb('LOOK AT');
    let res = engine.resolveInteraction(110, 160); // Click close to it
    
    if (!res.target || res.target.id !== 'throne' || res.action !== 'LOOK AT') {
        throw new Error("❌ Fallo en resolución de colisión/verbo.");
    }
    
    // Test 4: MISS Resolution
    let resMiss = engine.resolveInteraction(900, 900);
    if (resMiss.action !== 'MISS') {
         throw new Error("❌ Fallo de MISS de colisión.");
    }
    
    console.log(`[${WORKER_NAME}] ✅ ScummOverworldEngine: Todas las aserciones de cinemática y colisiones pasaron correctamente en estado Headless.`);
    
    return {
        status: "PASS",
        engine: "ScummOverworldEngine",
        coverage: ["Kinematics", "Hit-Detection", "State Injection"]
    };
}

// Se autoejecuta si lo llaman por línea de comandos. En el navegador `process`
// no existe y esto reventaba el módulo entero al importarlo.
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('scumm_overworld_gym')) {
    try {
        const res = runGymEpisode();
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
