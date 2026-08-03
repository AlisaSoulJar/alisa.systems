import * as THREE from 'three';
import { States, applyStateModifiers } from './States.js';

export { States };

export const MemoryTiers = {
    M0_AMNESIC: 0,        // Goldfish. No memory over time.
    M1_SHORT_TERM: 1,     // FIFO short-term buffer, wiped on reset.
    M2_EPISODIC_LOCAL: 2, // IndexedDB / LocalStorage cycle memory.
    M3_AKASHA_VECTOR: 3   // Direct access to ChromaDB Vector Store.
};

/**
 * ----------------------------------------------------
 * CAPA 1: PALEOCORTEX (Cerebro Reptiliano / Físicas Puras)
 * ----------------------------------------------------
 */
export class ReptilianBrain {
    constructor(config = {}) {
        this.velocity = new THREE.Vector3();
        
        this.maxSpeed = config.maxSpeed || 5.0;
        this.acceleration = config.acceleration || 10.0;
        this.friction = config.friction !== undefined ? config.friction : 5.0; 
        
        this.minY = config.minY !== undefined ? config.minY : 0.0;
        this.maxY = config.maxY !== undefined ? config.maxY : 0.0; 
        
        this.gravity = config.gravity !== undefined ? config.gravity : -9.8; 
    }

    solveKinematics(currentPos, intentVelocity, dt) {
        this.velocity.lerp(intentVelocity, this.acceleration * dt);
        
        if (intentVelocity.lengthSq() < 0.01) {
            this.velocity.multiplyScalar(1.0 - (this.friction * dt));
        }

        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }

        if (this.maxY === 0 && this.minY === 0) {
            this.velocity.y = 0;
            if (currentPos.y > 0.1) this.velocity.y += this.gravity * dt; 
            else currentPos.y = 0; 
        } else {
            if (currentPos.y < this.minY) {
                this.velocity.y += 10.0 * dt; 
            } else if (currentPos.y > this.maxY) {
                this.velocity.y -= 10.0 * dt; 
            }
        }

        currentPos.add(this.velocity.clone().multiplyScalar(dt));
    }
}

/**
 * ----------------------------------------------------
 * CAPA 2: SISTEMA LÍMBICO (Mesocortex / Emociones y Enjambres)
 * ----------------------------------------------------
 */
export class LimbicSystem {
    constructor(config = {}) {
        this.estado = config.estado || States.NEUTRAL;
        this.baseWanderAngle = Math.random() * Math.PI * 2;
    }

    processUrges(currentPos, target, dt, environment = {}) {
        let urgeVector = new THREE.Vector3();
        const stateMods = applyStateModifiers(this.estado, 1.0);
        
        if (target) {
            let diff = new THREE.Vector3().subVectors(target, currentPos);
            let dist = diff.length();
            if (dist > 0.01 && stateMods.speedMult > 0) {
                diff.normalize();
                if (stateMods.fearBias > 1.5 && dist < 15.0) {
                    diff.negate(); 
                } 
                urgeVector.copy(diff);
            }
        } else {
            this.baseWanderAngle += (Math.random() - 0.5) * 0.2;
            urgeVector.set(Math.sin(this.baseWanderAngle), 0, Math.cos(this.baseWanderAngle));
        }

        if (environment.siblings && environment.siblings.length > 0) {
            let cohesion = new THREE.Vector3();
            let separation = new THREE.Vector3();
            let count = 0;
            
            environment.siblings.forEach(sibling => {
                const sPos = sibling.position || sibling.mesh?.position;
                if(!sPos) return;
                
                const sDiff = new THREE.Vector3().subVectors(currentPos, sPos);
                const sDist = sDiff.length();
                
                if (sDist > 0.1 && sDist < 12.0) { 
                    cohesion.add(sPos);
                    separation.add(sDiff.normalize().divideScalar(sDist));
                    count++;
                }
            });
            
            if (count > 0) {
                cohesion.divideScalar(count).sub(currentPos).normalize().multiplyScalar(0.7 * stateMods.cohesionBias);
                separation.divideScalar(count).normalize().multiplyScalar(1.5);
                urgeVector.add(cohesion).add(separation).normalize();
            }
        }

        if (stateMods.jitter > 0) {
            urgeVector.x += (Math.random() - 0.5) * stateMods.jitter;
            urgeVector.z += (Math.random() - 0.5) * stateMods.jitter;
        }

        return {
            urgeVector: urgeVector.normalize(),
            speedMod: stateMods.speedMult,
            turnSmoothness: stateMods.turnSmoothness
        };
    }
}

/**
 * ----------------------------------------------------
 * EL HIPOCAMPO (Gestor de la Memoria Retentiva)
 * ----------------------------------------------------
 */
export class Hippocampus {
    constructor(config = {}) {
        this.tier = config.tier !== undefined ? config.tier : MemoryTiers.M0_AMNESIC;
        this.shortTermBuffer = [];
        this.bufferSize = 5; 
    }

    async store(key, value) {
        if (this.tier === MemoryTiers.M0_AMNESIC) return; 

        if (this.tier >= MemoryTiers.M1_SHORT_TERM) {
            this.shortTermBuffer.push({ key, value, ts: Date.now() });
            if (this.shortTermBuffer.length > this.bufferSize) this.shortTermBuffer.shift();
        }

        if (this.tier >= MemoryTiers.M2_EPISODIC_LOCAL) {
            try {
                localStorage.setItem(`alisa_mem_${key}`, JSON.stringify(value));
            } catch(e) { console.error("Episodic fault: ", e); }
        }

        if (this.tier === MemoryTiers.M3_AKASHA_VECTOR) {
            console.log(`[Akasha] Crystalizing Vector: ${key}`);
        }
    }

    async recall(key) {
        if (this.tier === MemoryTiers.M0_AMNESIC) return null;

        const shortMem = this.shortTermBuffer.find(m => m.key === key);
        if (shortMem) return shortMem.value;

        if (this.tier >= MemoryTiers.M2_EPISODIC_LOCAL) {
            const localMem = localStorage.getItem(`alisa_mem_${key}`);
            if (localMem) return JSON.parse(localMem);
        }

        if (this.tier === MemoryTiers.M3_AKASHA_VECTOR) {
            console.log(`[Akasha] Querying Vector Database for: ${key}`);
            return { from: "akasha", data: null };
        }

        return null;
    }
}
