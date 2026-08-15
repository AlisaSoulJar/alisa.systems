/**
 * PHANTOM FSM ENGINE — Weeping Angel Behavior (V4 JIT ECS EDITION)
 * ──────────────────────────────────────────────────────────────
 * Fully integrated into the V4 OverworldECS.
 * Uses NavMeshAgentComponent for physical pathing mathematically decoupling 
 * navigation from pure radial chasing.
 */
 
export const PhantomComponent = (config = {}) => ({
    ambushKillThreshold: config.ambushKillThreshold || 3.0,
    pushbackSpeed: config.pushbackSpeed || 4.0,
    despawnDuration: config.despawnDuration || 0.5,
    ambushDecayRate: config.ambushDecayRate || 1.0,
    illuminationDecayRate: config.illuminationDecayRate || 2.0,
    
    phase: 'hunting',       // 'hunting' | 'ambushing' | 'despawning'
    ambushTimer: 0,
    isIlluminated: false,
    isDead: false,
    visibility: 0,
    hoverY: 0,
    events: [],

    targetEntityId: config.targetEntityId !== undefined ? config.targetEntityId : -1
});

export class PhantomFSMSystem {
    /**
     * @param {Object} [config]
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible relocations.
     */
    constructor(config = {}) {
        this.rng = config.rng || Math.random;
    }

    update(ecs, entities, dt) {
        for (const entityId of entities) {
            const phantom = ecs.getComponent(entityId, 'PhantomComponent');
            const navAgent = ecs.getComponent(entityId, 'NavMeshAgentComponent');
            const transform = ecs.getComponent(entityId, 'TransformComponent');
            
            if (!phantom || !navAgent || !transform) continue;

            phantom.events = [];

            // 1. Get prey position
            let preyPos = null;
            if (phantom.targetEntityId !== -1) {
                const preyTransform = ecs.getComponent(phantom.targetEntityId, 'TransformComponent');
                if (preyTransform) {
                    preyPos = { x: preyTransform.x, z: preyTransform.z };
                }
            }

            // If we don't have prey yet, just idle / hunt blindly
            if (!preyPos) {
                phantom.phase = 'hunting';
                phantom.ambushTimer = Math.max(0, phantom.ambushTimer - dt * phantom.ambushDecayRate);
                phantom.hoverY = Math.sin(Date.now() * 0.002) * 0.1;
                phantom.visibility = 1.0;
                continue;
            }

            // 2. Desk spawning phase (Flashing out and relocating)
            if (phantom.phase === 'despawning') {
                phantom.ambushTimer -= dt;
                phantom.visibility = (Date.now() % 200 > 100) ? 0.8 : 0.0;
                navAgent.targetPosition = null; // Halt movement

                if (phantom.ambushTimer <= 0) {
                    phantom.phase = 'hunting';
                    phantom.ambushTimer = 0;
                    phantom.visibility = 1.0;
                    phantom.events.push('relocated');
                    
                    // Simple relocation far from player for now (in real system, pick furthest room)
                    transform.x = preyPos.x + 30 * (this.rng() > 0.5 ? 1 : -1);
                    transform.z = preyPos.z + 30 * (this.rng() > 0.5 ? 1 : -1);
                }
                continue;
            }
            
            // 3. Strobe / Illumination Pushback Mechanic
            // Note: isIlluminated should be set by a Raycaster/Light System checking the player's flashlight
            if (phantom.isIlluminated) {
                phantom.ambushTimer = Math.max(0, phantom.ambushTimer - dt * phantom.illuminationDecayRate);
                phantom.visibility = 1.0;
                
                // Panic flee: Command NavMesh to walk AWAY from player
                navAgent.targetPosition = {
                    x: transform.x + (transform.x - preyPos.x) * 2,
                    z: transform.z + (transform.z - preyPos.z) * 2
                };
                
                // For simplicity, if pushed back sufficiently in light, it despawns
                if (phantom.ambushTimer <= 0) {
                    phantom.phase = 'despawning';
                    phantom.ambushTimer = phantom.despawnDuration;
                    phantom.events.push('vanished');
                }
            } else {
                // 4. Ambushing! (Tracking prey using A* via the ECS)
                phantom.phase = 'ambushing';
                phantom.ambushTimer += dt;
                phantom.hoverY = Math.sin(Date.now() * 0.005) * 0.2;

                if (phantom.ambushTimer < phantom.ambushKillThreshold) {
                    // Invisible while stalking
                    phantom.visibility = 0.2; 
                } else {
                    // Materializing for the kill!
                    const fadeIn = Math.min(1.0, (phantom.ambushTimer - phantom.ambushKillThreshold) * 4.0);
                    phantom.visibility = fadeIn;
                }

                if (phantom.ambushTimer > phantom.ambushKillThreshold + 1.0) {
                    phantom.isDead = true; 
                    phantom.events.push('killed_prey');
                }
                
                // Set the Pathfinding target to the Player's position!
                // The NavMeshAgentSystem will calculate the A* path dynamically avoiding walls.
                navAgent.targetPosition = { x: preyPos.x, z: preyPos.z };
            }
        }
    }
}
