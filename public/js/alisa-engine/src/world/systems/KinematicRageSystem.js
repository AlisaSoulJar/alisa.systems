// KinematicRageEngine.js - Deterministic Rigid Body "Table Flip" Physics

export class KinematicRageSystem {
    /**
     * @param {Object} config 
     * @param {number} config.gravity 
     */
    constructor(config = {}) {
        this.gravity = config.gravity || -60.0;
    }

    /**
     * Injects kinematic impulse data into abstract entities
     * @param {Array} entities Array of rigid objects { id }
     * @param {Object} forceProfile Characteristics of the explosion
     * @param {number} forceProfile.floorY The boundary plane Y where objects bounce
     * @param {number} forceProfile.horizontalForce Multiplier for X/Z scatter
     * @param {number} forceProfile.verticalForce Multiplier for Y blast
     * @returns {Array} List of entities with injected `rageState` { velocity: {x,y,z}, rotVelocity: {x,y,z}, bounce, floorY }
     */
    applyImpulse(entities, forceProfile) {
        const hF = forceProfile.horizontalForce || 15.0;
        const vF = forceProfile.verticalForce !== undefined ? forceProfile.verticalForce : 30.0;
        const floorY = forceProfile.floorY || -10.0;

        return entities.map(entity => {
            const isBoard = entity.isBoard; // Custom flag if it's the massive board
            
            // Boards get smaller impulse, pieces get scattered
            const scatterX = isBoard ? (Math.random() - 0.5) * (hF / 3) : (Math.random() - 0.5) * hF;
            const blastY = isBoard ? 12.0 : (Math.random() * vF + 20);
            const scatterZ = isBoard ? (Math.random() * (hF/2) + 5) : (Math.random() * (hF*1.5) + 10);
            
            const rX = isBoard ? Math.random() * 0.2 : (Math.random() - 0.5);
            const rY = isBoard ? Math.random() * 0.2 : (Math.random() - 0.5);
            const rZ = isBoard ? 0 : (Math.random() - 0.5);

            return {
                id: entity.id,
                position: { ...entity.position },
                rotation: { ...entity.rotation },
                rageState: {
                    velocity: { x: scatterX, y: blastY, z: scatterZ },
                    rotVelocity: { x: rX, y: rY, z: rZ },
                    bounce: isBoard ? 0.3 : 0.4 + Math.random() * 0.2, // Pieces are bouncier
                    floorY: floorY
                }
            };
        });
    }

    /**
     * Executes one frame of Euler kinematic physics
     * @param {Array} dynamicEntities 
     * @param {number} dt Delta time
     * @returns {Array} Updated states for the entities
     */
    tick(dynamicEntities, dt = 0.016) {
        return dynamicEntities.map(entity => {
            if (!entity.rageState) return { ...entity };

            const state = entity.rageState;
            
            // Gravity
            state.velocity.y += this.gravity * dt;

            // Integration
            const px = entity.position.x + (state.velocity.x * dt);
            const py = entity.position.y + (state.velocity.y * dt);
            const pz = entity.position.z + (state.velocity.z * dt);
            
            const rx = entity.rotation.x + state.rotVelocity.x;
            const ry = entity.rotation.y + state.rotVelocity.y;
            const rz = entity.rotation.z + state.rotVelocity.z;
            
            let finalY = py;

            // Boundary Box (Floor Collision)
            if (py < state.floorY) {
                finalY = state.floorY;
                // Bounce
                state.velocity.y *= -state.bounce;
                // Floor Friction applies to X and Z
                state.velocity.x *= 0.75; 
                state.velocity.z *= 0.75;
                // Dampen rotation 
                state.rotVelocity.x *= 0.6;
                state.rotVelocity.y *= 0.6;
                state.rotVelocity.z *= 0.6;
            }

            return {
                id: entity.id,
                position: { x: px, y: finalY, z: pz },
                rotation: { x: rx, y: ry, z: rz },
                rageState: state // keep ref
            };
        });
    }
}
