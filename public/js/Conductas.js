import * as THREE from 'three';

/**
 * Conductas.js - The Physical Domain (El Cuerpo / Especie)
 * Maps to the Bestiario elemental locomotion logic. Resolves the final translation vectors.
 */

export const Conductas = {
    AVIAN_ORBITAL: 'avian_orbital',     // Flying, locks to Y flight altitude
    WATER_BOID: 'water_boid',           // Swimming, true 3D fluid movement
    TERRA_NAVMESH: 'terra_navmesh',     // Ground walking, respects Y=0 gravity
    GHOST_CLIP: 'ghost_clip',           // Levitation, ignores collisions, phased
    BURROWER: 'burrower',               // Digging (Y < 0), surfaces near target
    SWARM_GROUND: 'swarm_ground',       // Boids physics but restricted to Terra Navmesh
    STATIC_TURRET: 'static_turret',     // Anchored physical object, revolves in place
    LINEAR_TRANSIT: 'linear_transit'    // Unyielding line-axis movement (Peatón cars)
};

/**
 * Applies physical constraints and environment rules to the final velocity vector.
 * @param {string} conducta The physical species type.
 * @param {THREE.Vector3} currentPos 
 * @param {THREE.Vector3} intentVelocity The combined intent from State x Psyche
 * @param {Object} environment Contains raycasters, colliders, or other actors
 * @returns {THREE.Vector3} The constrained physical vector
 */
export function solveConductaPhysics(conducta, currentPos, intentVelocity, environment = {}) {
    let finalVelocity = intentVelocity.clone();

    // Swarm Cohesion multiplier is fetched from the environment if injected by Oxytocin (State)
    const cohesionMod = environment.cohesionBias || 1.0;

    switch(conducta) {
        case Conductas.GHOST_CLIP:
            // Absolute freedom of movement. Slight levitation noise applied.
            finalVelocity.y += Math.sin(Date.now() * 0.002) * 0.5;
            break;

        case Conductas.AVIAN_ORBITAL:
            // Flight altitude clamping
            const flightAltitude = 15.0;
            if (currentPos.y < flightAltitude - 1) finalVelocity.y += 2.0;
            else if (currentPos.y > flightAltitude + 1) finalVelocity.y -= 2.0;
            else finalVelocity.y = 0; // Maintain altitude
            break;

        case Conductas.TERRA_NAVMESH:
            // Pure ground movement. 
            finalVelocity.y = 0;
            if (currentPos.y > 1.0) finalVelocity.y = -9.8; // Gravity drop if spawned mid-air
            break;

        case Conductas.BURROWER:
            // Diglett physics: Retreats underground to travel, pops up when near target
            const dist = environment.distToTarget || 10;
            if (dist > 5.0) {
                // Travel mode: Dive underground
                if (currentPos.y > -2.0) finalVelocity.y = -2.0;
                else finalVelocity.y = 0;
            } else {
                // Strike mode: Emerge
                if (currentPos.y < 1.0) finalVelocity.y = 3.0; // Fast pop up
                else finalVelocity.y = 0;
            }
            break;

        case Conductas.STATIC_TURRET:
            // No movement translation allowed, rotation only (rotation handled in Archetype engine)
            finalVelocity.set(0, 0, 0);
            break;

        case Conductas.LINEAR_TRANSIT:
            // Unyielding movement straight along local Z axis
            finalVelocity.x = 0;
            finalVelocity.y = 0;
            // The speed calculation from state still applies, but direction is locked.
            break;

        case Conductas.WATER_BOID:
        case Conductas.SWARM_GROUND:
            // Complex Swarm mechanics
            if (conducta === Conductas.SWARM_GROUND) {
                finalVelocity.y = 0; // Clamp to ground
            }

            if (environment.siblings && environment.siblings.length > 0) {
                let cohesion = new THREE.Vector3();
                let separation = new THREE.Vector3();
                // alignment logic pending sibling velocity availability
                let count = 0;
                
                environment.siblings.forEach(sibling => {
                    const diff = new THREE.Vector3().subVectors(currentPos, sibling.position);
                    const siblingDist = diff.length();
                    
                    if (siblingDist > 0.1 && siblingDist < 10) { 
                        cohesion.add(sibling.position);
                        separation.add(diff.normalize().divideScalar(siblingDist));
                        count++;
                    }
                });
                
                if (count > 0) {
                    // Apply modifiers
                    cohesion.divideScalar(count).sub(currentPos).normalize().multiplyScalar(0.5 * cohesionMod);
                    separation.divideScalar(count).normalize().multiplyScalar(1.5);
                    
                    finalVelocity.add(cohesion).add(separation).normalize();
                }
            }
            break;
    }

    return finalVelocity;
}
