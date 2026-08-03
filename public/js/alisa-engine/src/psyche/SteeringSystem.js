// SteeringKinematicsSystem.js - Universal Headless Steering Behaviors
// Provides Reynolds Flocking, Seek, Flee, and Arrive logic.

export class SteeringSystem {
    
    /**
     * Calculates the basic requested steering vector towards a target direction
     */
    static steer(currentVelocity, targetDir, maxSpeed, maxForce, normalizeTarget = true) {
        let tx = targetDir.x;
        let ty = targetDir.y || 0;
        let tz = targetDir.z;

        if (normalizeTarget) {
            const mag = Math.sqrt(tx*tx + ty*ty + tz*tz);
            if (mag > 0) {
                tx = (tx / mag) * maxSpeed;
                ty = (ty / mag) * maxSpeed;
                tz = (tz / mag) * maxSpeed;
            }
        }

        let steerX = tx - currentVelocity.x;
        let steerY = ty - (currentVelocity.y || 0);
        let steerZ = tz - currentVelocity.z;

        const sMagSq = steerX*steerX + steerY*steerY + steerZ*steerZ;
        if (sMagSq > maxForce*maxForce) {
            const sMag = Math.sqrt(sMagSq);
            steerX = (steerX / sMag) * maxForce;
            steerY = (steerY / sMag) * maxForce;
            steerZ = (steerZ / sMag) * maxForce;
        }

        return { x: steerX, y: steerY, z: steerZ };
    }

    /**
     * Calculates combined Flocking forces (Separation, Alignment, Cohesion)
     * @param {Object} agent {position, velocity}
     * @param {Array} neighbors Array of other agents
     * @param {Object} config {sepR, aliR, cohR, maxSpeed, maxForce}
     * @returns {Object} {x, y, z} The combined steering force
     */
    static calculateFlocking(agent, neighbors, config) {
        let sep = {x:0, y:0, z:0};
        let ali = {x:0, y:0, z:0};
        let coh = {x:0, y:0, z:0};
        
        let sepCount = 0; let aliCount = 0; let cohCount = 0;

        const sepR = config.sepR || 1.5;
        const aliR = config.aliR || 4.0;
        const cohR = config.cohR || 4.0;

        for (let i = 0; i < neighbors.length; i++) {
            const other = neighbors[i];
            if (other === agent || other.id === agent.id) continue;
            
            const dx = agent.position.x - other.position.x;
            const dy = (agent.position.y || 0) - (other.position.y || 0);
            const dz = agent.position.z - other.position.z;
            const distSq = dx*dx + dy*dy + dz*dz;

            if (distSq > 0 && distSq < sepR * sepR) {
                const dist = Math.sqrt(distSq);
                sep.x += (dx / dist) / dist;
                sep.y += (dy / dist) / dist;
                sep.z += (dz / dist) / dist;
                sepCount++;
            }

            if (distSq > 0 && distSq < aliR * aliR) {
                ali.x += other.velocity.x;
                ali.y += (other.velocity.y || 0);
                ali.z += other.velocity.z;
                aliCount++;
            }

            if (distSq > 0 && distSq < cohR * cohR) {
                coh.x += other.position.x;
                coh.y += (other.position.y || 0);
                coh.z += other.position.z;
                cohCount++;
            }
        }

        if (sepCount > 0) {
            sep = this.steer(agent.velocity, { x: sep.x/sepCount, y: sep.y/sepCount, z: sep.z/sepCount }, config.maxSpeed, config.maxForce, true);
        }
        if (aliCount > 0) {
            ali = this.steer(agent.velocity, { x: ali.x/aliCount, y: ali.y/aliCount, z: ali.z/aliCount }, config.maxSpeed, config.maxForce, false);
        }
        if (cohCount > 0) {
            const target = { 
                x: coh.x/cohCount - agent.position.x, 
                y: coh.y/cohCount - (agent.position.y || 0), 
                z: coh.z/cohCount - agent.position.z 
            };
            coh = this.steer(agent.velocity, target, config.maxSpeed, config.maxForce, true);
        }

        return {
            x: sep.x * 1.5 + ali.x * 1.0 + coh.x * 1.0,
            y: sep.y * 1.5 + ali.y * 1.0 + coh.y * 1.0,
            z: sep.z * 1.5 + ali.z * 1.0 + coh.z * 1.0
        };
    }

    /**
     * Intelligent Driver Model (IDM) car-following acceleration calculus.
     * @returns {number} The 1D acceleration to apply.
     */
    static calculateIDM(egoVelocity, leadVelocity, distanceToLead, config) {
        if (distanceToLead === Infinity) {
            return config.a * (1 - Math.pow(egoVelocity / config.v0, config.delta));
        }
        
        const deltaV = egoVelocity - leadVelocity;
        const s_star = config.s0 + Math.max(0, (egoVelocity * config.T) + ((egoVelocity * deltaV) / (2 * Math.sqrt(config.a * config.b))));
        
        return config.a * (1 - Math.pow(egoVelocity / config.v0, config.delta) - Math.pow(s_star / distanceToLead, 2));
    }

    /**
     * Calculates a fleeing force away from a predator or point
     */
    static flee(agent, targetPosition, fleeRadius, maxSpeed, maxForce) {
        let flee = {x:0, y:0, z:0};
        const dx = agent.position.x - targetPosition.x;
        const dy = (agent.position.y || 0) - (targetPosition.y || 0);
        const dz = agent.position.z - targetPosition.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        
        if (distSq < fleeRadius * fleeRadius) {
            let f = this.steer(agent.velocity, { x: dx, y: dy, z: dz }, maxSpeed, maxForce, true);
            flee.x += f.x;
            flee.y += f.y;
            flee.z += f.z;
        }
        return flee;
    }

    /**
     * Calculates a seeking force towards a target
     */
    static seek(agent, targetPosition, seekRadius, maxSpeed, maxForce) {
        let seek = {x:0, y:0, z:0};
        const dx = targetPosition.x - agent.position.x;
        const dy = (targetPosition.y || 0) - (agent.position.y || 0);
        const dz = targetPosition.z - agent.position.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        
        if (distSq < seekRadius * seekRadius) {
            seek = this.steer(agent.velocity, { x: dx, y: dy, z: dz }, maxSpeed, maxForce, true);
        }
        return seek;
    }
}
