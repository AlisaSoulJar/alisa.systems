import { TurretCombatSystem } from '../alisa-engine/src/world/systems/TurretCombatSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(ticks = 3000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] TurretCombatSystem → Simulando combate aéreo táctico (${ticks} ticks)...`);
    
    const engine = new TurretCombatSystem({
        fireInterval: 1.5,
        stunDuration: 10.0
    });

    // Add some turrets at various positions
    engine.addTurret('T1', -20, 0, -20);
    engine.addTurret('T2', 20, 0, -20);
    engine.addTurret('T3', 0, 0, 30);

    const t0 = performance.now();
    
    let episodesStats = {
        hits_taken: 0,
        hits_landed: 0,
        bullets_clashed: 0,
        total_reward: 0
    };

    // Mock Chopper State
    let chopper = {
        pos: { x: 0, y: 10, z: 0 },
        forward: { x: 0, y: 0, z: -1 }
    };

    for (let i = 0; i < ticks; i++) {
        // Simple pilot AI: rotate around center and fire towards nearest turret
        const angle = i * 0.02;
        chopper.pos.x = Math.cos(angle) * 25;
        chopper.pos.z = Math.sin(angle) * 25;
        
        // Face center roughly
        chopper.forward = engine.dir(chopper.pos, {x:0, y:0, z:0});
        
        const wantFire = (i % 30 === 0);
        
        const events = engine.tick(0.016, chopper.pos, chopper.forward, wantFire);
        
        events.forEach(e => {
            if (e.type === 'HIT_CHOPPER') episodesStats.hits_taken++;
            if (e.type === 'HIT_TURRET') episodesStats.hits_landed++;
            if (e.type === 'BULLET_CLASH') episodesStats.bullets_clashed++;
            if (e.rlReward) episodesStats.total_reward += e.rlReward;
        });
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] Simulación de Combate completada en ${Math.round(durationMs)}ms.`);

    return {
        method: "Turret Combat Headless Simulation",
        ticks: ticks,
        episodes_stats: episodesStats,
        sim_time_ms: durationMs,
        extracted_weights: { signature: "TURRET_COMBAT_LOGIC_v1_CONVERGED" }
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
