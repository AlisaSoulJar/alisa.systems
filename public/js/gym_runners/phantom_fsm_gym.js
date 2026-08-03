import { ECSWorld, TransformComponent } from '../alisa-engine/src/world/OverworldECS.js';
import { NavMeshAgentComponent } from '../alisa-engine/src/world/systems/NavMeshAgentSystem.js';
import { PhantomFSMSystem, PhantomComponent } from '../alisa-engine/src/world/systems/PhantomFSMSystem.js';

export async function runGymEpisode(ticks = 500, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] OverworldECS → Iniciando simulación determinista (Headless) de ${ticks} ticks para PhantomFSMSystem...`);
    
    const ecs = new ECSWorld();
    const phantomSystem = new PhantomFSMSystem();
    
    ecs.addSystem(phantomSystem.update.bind(phantomSystem), ['PhantomComponent', 'NavMeshAgentComponent', 'TransformComponent']);

    // Mock Player (Prey) Entity
    const playerId = ecs.createEntity();
    ecs.addComponent(playerId, 'TransformComponent', TransformComponent(0, 0, 0));
    
    // Mock Phantom Entity
    const phantomId = ecs.createEntity();
    ecs.addComponent(phantomId, 'TransformComponent', TransformComponent(50, 0, 50));
    ecs.addComponent(phantomId, 'NavMeshAgentComponent', NavMeshAgentComponent({ maxSpeed: 4.0 }));
    ecs.addComponent(phantomId, 'PhantomComponent', PhantomComponent({ targetEntityId: playerId }));

    const t0 = performance.now();
    let stateTransitions = 0;
    
    // We cannot easily poll nested phase since it is inside component, but we can access it
    let lastPhase = ecs.getComponent(phantomId, 'PhantomComponent').phase;

    for (let i = 0; i < ticks; i++) {
        ecs.tick(0.016); // 60fps simulated dt
        
        const currPhase = ecs.getComponent(phantomId, 'PhantomComponent').phase;
        if (currPhase !== lastPhase) {
            stateTransitions++;
            lastPhase = currPhase;
        }
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    
    const finalPhantom = ecs.getComponent(phantomId, 'PhantomComponent');
    const finalTransform = ecs.getComponent(phantomId, 'TransformComponent');
    
    console.log(`[${WORKER_NAME}] Simulación Phantom ECS completada en ${Math.round(durationMs)}ms.`);

    return {
        method: "Phantom ECS Headless RL",
        ticks: ticks,
        final_state: finalPhantom.phase,
        transitions_observed: stateTransitions,
        escaped_or_caught: finalPhantom.isDead ? "CAUGHT" : "ESCAPED",
        sim_time_ms: durationMs,
        final_position: { x: finalTransform.x, z: finalTransform.z }
    };
}
