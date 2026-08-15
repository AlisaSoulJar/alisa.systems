// KinematicRageSystem.js — física de cuerpo rígido para volcar la mesa

/**
 * ⚠️ PONÍA «DETERMINISTIC» EN LA PRIMERA LÍNEA Y NO LO ERA.
 *
 * `applyImpulse` llamaba directamente a la función global de azar del motor de JS:
 * dos volcados con los mismos datos daban dos estropicios distintos. Es justo la
 * etiqueta-que-no-corresponde que nos mordió el 13-08-2026 con el temblor de las
 * cartas, y en un proyecto cuya tesis es «una partida se verifica volviéndola a
 * jugar» esa palabra no se puede dejar puesta a la ligera.
 *
 * Aquí el azar es lo que se quiere —una rabieta calcada no parece una rabieta— así
 * que no se quita: se hace INYECTABLE. Con la semilla puesta, dos volcados con la
 * misma semilla salen iguales y se puede grabar uno; sin ella, cada uno es distinto.
 *
 * Y que quede dicho: esto NO toca el `rnd` de la partida. Volcar la mesa es un gesto
 * de la mesa, no una jugada — no entra en `legal_moves`, no viaja en el recibo y no
 * cambia el estado. Al siguiente repintado está todo otra vez en su sitio.
 *
 * 2026-08-16: se renombró `this.azar` a `this.rng` para seguir el mismo nombre que
 * usa el resto del motor (`BSPSystem`, `TrafficSystem`...) y que esta comprobación
 * sabe buscar. `config.azar` se mantiene como alias — `volcar.js`, fuera de mi zona
 * de trabajo, todavía se lo pasa así — pero ahora entra por la misma puerta.
 */
export class KinematicRageSystem {
    /**
     * @param {Object} config
     * @param {number} config.gravity
     * @param {() => number} [config.rng] Fuente de azar en [0,1). Por defecto
     *        `Math.random`. Pásale un generador con semilla si quieres repetir el
     *        mismo estropicio. `config.azar` funciona igual, por compatibilidad.
     */
    constructor(config = {}) {
        this.gravity = config.gravity || -60.0;
        this.rng = config.rng || config.azar || Math.random;
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
            const scatterX = isBoard ? (this.rng() - 0.5) * (hF / 3) : (this.rng() - 0.5) * hF;
            const blastY = isBoard ? 12.0 : (this.rng() * vF + 20);
            const scatterZ = isBoard ? (this.rng() * (hF/2) + 5) : (this.rng() * (hF*1.5) + 10);

            const rX = isBoard ? this.rng() * 0.2 : (this.rng() - 0.5);
            const rY = isBoard ? this.rng() * 0.2 : (this.rng() - 0.5);
            const rZ = isBoard ? 0 : (this.rng() - 0.5);

            return {
                id: entity.id,
                position: { ...entity.position },
                rotation: { ...entity.rotation },
                rageState: {
                    velocity: { x: scatterX, y: blastY, z: scatterZ },
                    rotVelocity: { x: rX, y: rY, z: rZ },
                    bounce: isBoard ? 0.3 : 0.4 + this.rng() * 0.2, // Pieces are bouncier
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
