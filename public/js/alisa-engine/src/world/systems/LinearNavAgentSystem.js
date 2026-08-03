export const LinearNavAgentComponent = (params = {}) => ({
    targetX: params.targetX !== undefined ? params.targetX : null,
    targetZ: params.targetZ !== undefined ? params.targetZ : null,
    speed: params.speed || 12.0,
    isMoving: false,
    arrivalRadius: params.arrivalRadius || 0.1,
    onArrived: params.onArrived || null,
    // Store current pos so the system can mutate it directly
    x: params.x || 0,
    z: params.z || 0,
    // Add velocity vector outputs for visual rotation interpolation
    vx: 0,
    vz: 0
});

export class LinearNavAgentSystem {
    update(ecs, entities, dt) {
        for (const entityId of entities) {
            const agent = ecs.getComponent(entityId, 'LinearNavAgentComponent');
            if (!agent) continue;
            
            if (agent.targetX !== null || agent.targetZ !== null) {
                const tx = agent.targetX !== null ? agent.targetX : agent.x;
                const tz = agent.targetZ !== null ? agent.targetZ : agent.z;
                
                const dx = tx - agent.x;
                const dz = tz - agent.z;
                const dist = Math.hypot(dx, dz);
                
                if (dist > agent.arrivalRadius) {
                    const nx = dx / dist;
                    const nz = dz / dist;
                    
                    agent.vx = nx * agent.speed;
                    agent.vz = nz * agent.speed;
                    
                    agent.x += agent.vx * dt;
                    agent.z += agent.vz * dt;
                    agent.isMoving = true;
                } else {
                    agent.x = tx;
                    agent.z = tz;
                    agent.targetX = null;
                    agent.targetZ = null;
                    agent.vx = 0;
                    agent.vz = 0;
                    agent.isMoving = false;
                    
                    if (agent.onArrived) {
                        // Store callback reference and nullify before calling to prevent double-firing
                        const cb = agent.onArrived;
                        agent.onArrived = null;
                        cb(entityId);
                    }
                }
            } else {
                agent.isMoving = false;
                agent.vx = 0;
                agent.vz = 0;
            }
        }
    }
}
