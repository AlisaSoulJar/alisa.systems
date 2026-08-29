import { KinematicRageSystem } from '../alisa-engine/src/world/systems/KinematicRageSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(ticks = 1000, WORKER_NAME = "LabRat") {
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
