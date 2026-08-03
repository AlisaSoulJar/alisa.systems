import * as THREE from 'three';
import { States, applyStateModifiers } from './States.js';
import { Psyches, buildPsycheIntent } from './Psyches.js';
import { Conductas, solveConductaPhysics } from './Conductas.js';

// Re-export the Enums
export { States, Psyches, Conductas };

/**
 * ALISA Game AI - The Master Conjugator
 * Entity Behavior = Conducta (Physics) x Psyche (Trait) x Estado (Mood)
 */
export class AutonomousEntity {
    constructor(mesh, config = {}) {
        this.mesh = mesh;
        
        // The Triad
        this.conducta = config.conducta || Conductas.TERRA_NAVMESH;
        this.psicologia = config.psicologia || Psyches.NEUTRAL;
        this.estado = config.estado || States.NEUTRAL;
        
        // Physics limits
        this.baseSpeed = config.baseSpeed || 5.0;
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        
        // Context
        this.target = null;   // The stimulus
    }
    
    setTarget(vec3) {
        if(vec3 instanceof THREE.Vector3) {
            this.target = vec3.clone();
        } else {
            this.target = null;
        }
    }
    
    setEstado(nuevoEstado) {
        this.estado = nuevoEstado;
    }

    /**
     * Core Update Loop
     */
    update(dt, environment = {}) {
        if (!this.mesh) return;
        
        // 1. Calculate Base Intent
        let intentVector = this._getBaseIntent();
        
        // 2. State Domain calculates chemical modifiers
        const stateMods = applyStateModifiers(this.estado, this.baseSpeed);
        if (this.estado === States.MELATONIC) return; // Sleep bypass
        
        // 3. Psyche Domain modifies intent vectors (Fear bias overrides cowardice if Endorphinic)
        let effectivePsyche = this.psicologia;
        if (stateMods.fearBias === 0.0 && this.psicologia === Psyches.THE_SCIENTIST) {
            // Endorphins make the scientist stop distancing
            effectivePsyche = Psyches.NEUTRAL; 
        }
        intentVector = buildPsycheIntent(effectivePsyche, this.mesh.position, this.target, intentVector);
        
        // Apply Jitter (Cortisol noise)
        if (stateMods.jitter > 0) {
            intentVector.x += (Math.random() - 0.5) * stateMods.jitter;
            intentVector.z += (Math.random() - 0.5) * stateMods.jitter;
            intentVector.normalize();
        }
        
        // 4. Conducta Domain calculates Physics
        // Inject data into environment for Conducta physics
        if (this.target) {
            environment.distToTarget = new THREE.Vector3().subVectors(this.target, this.mesh.position).length();
        }
        environment.cohesionBias = stateMods.cohesionBias; // Pass Oxytocin to Boids
        
        intentVector = solveConductaPhysics(this.conducta, this.mesh.position, intentVector, environment);
        
        // 5. Final Force Application
        const targetSpeed = this.baseSpeed * stateMods.speedMult;
        this.velocity.lerp(intentVector.multiplyScalar(targetSpeed), stateMods.turnSmoothness * dt);
        
        // Move
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
        
        // Rotate (Unless it's a Static Turret which only rotates but doesn't move)
        const vSq = this.velocity.lengthSq();
        if(vSq > 0.01) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            let diff = targetRotation - this.mesh.rotation.y;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * stateMods.turnSmoothness * dt;
        } else if (this.conducta === Conductas.STATIC_TURRET && this.target) {
            // Force rotation for turrets
            const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position);
            const targetRotation = Math.atan2(dir.x, dir.z);
            let diff = targetRotation - this.mesh.rotation.y;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 5.0 * dt;
        }
    }

    _getBaseIntent() {
        let intent = new THREE.Vector3();
        
        if (this.target && this.estado !== States.NEUTRAL) {
            intent.subVectors(this.target, this.mesh.position);
            intent.y = 0;
            if (intent.lengthSq() > 0) intent.normalize();
        } else {
            this.wanderAngle += (Math.random() - 0.5) * 0.1;
            intent.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
        }

        return intent;
    }
}
