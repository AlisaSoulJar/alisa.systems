import { KinematicRageSystem } from '../alisa-engine/src/world/systems/KinematicRageSystem.js';

export async function runGymEpisode(ticks = 1000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] KinematicRageSystem → Table Flip Physics (Headless Rigid Body) por ${ticks} ticks...`);

    const engine = new KinematicRageSystem({ gravity: -60.0 });

    // Crear entidades (piezas de juego de mesa + tablero)
    const entities = [];
    for (let i = 0; i < 20; i++) {
        entities.push({
            id: `piece_${i}`,
            isBoard: i === 0,
            position: { x: (Math.random() - 0.5) * 4, y: 0.5 + Math.random() * 2, z: (Math.random() - 0.5) * 4 },
            rotation: { x: 0, y: Math.random() * 6.28, z: 0 }
        });
    }

    // Aplicar impulso explosivo
    let dynamic = engine.applyImpulse(entities, {
        floorY: -5.0,
        horizontalForce: 20.0,
        verticalForce: 35.0
    });

    const dt = 0.016;
    const t0 = performance.now();
    let bounces = 0;
    let maxHeight = 0;

    for (let t = 0; t < ticks; t++) {
        const prevPositions = dynamic.map(e => e.position.y);
        dynamic = engine.tick(dynamic, dt);

        // Contar bounces y track máxima altura
        for (let i = 0; i < dynamic.length; i++) {
            if (dynamic[i].rageState && prevPositions[i] > dynamic[i].rageState.floorY && dynamic[i].position.y <= dynamic[i].rageState.floorY) {
                bounces++;
            }
            if (dynamic[i].position.y > maxHeight) maxHeight = dynamic[i].position.y;
        }
    }

    const t1 = performance.now();

    // Calcular energía residual
    let residualEnergy = 0;
    for (const e of dynamic) {
        if (e.rageState) {
            const v = e.rageState.velocity;
            residualEnergy += Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }
    }

    console.log(`[${WORKER_NAME}] Simulación Rage completada en ${Math.round(t1 - t0)}ms. Bounces: ${bounces}`);

    return {
        method: "Kinematic Rage Table Flip (Euler + Bounce + Friction)",
        ticks,
        entities: dynamic.length,
        total_bounces: bounces,
        max_height: maxHeight.toFixed(2),
        residual_energy: residualEnergy.toFixed(3),
        final_positions: dynamic.slice(0, 3).map(e => ({
            id: e.id,
            y: e.position.y.toFixed(2)
        })),
        sim_time_ms: t1 - t0
    };
}
