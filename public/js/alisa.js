import * as THREE from 'three';
import { ReptilianBrain, LimbicSystem, Hippocampus, States, MemoryTiers } from './soma.js';
import { Neocortex, Psyches, CognitiveTiers } from './psyche.js';
// WorldManager/RealWorldHarness wouldn't be internal to the Being, it's external, injected via 'update()'.

export { States, Psyches, CognitiveTiers, MemoryTiers };

/**
 * ----------------------------------------------------
 * THE SEED: SOVEREIGN BEING (La Entidad Universal Triuna)
 * ----------------------------------------------------
 * La Vasija. Toma a Soma y a Psyche y los ancla al plano de World.
 */
export class SovereignBeing {
    constructor(mesh, brainConfig = {}) {
        this.mesh = mesh;
        
        // The Triune Brain + Memory Instantiation
        this.reptilian = new ReptilianBrain(brainConfig.physics);
        this.limbic = new LimbicSystem({ estado: brainConfig.estado });
        this.neocortex = new Neocortex({ psyche: brainConfig.psyche, tier: brainConfig.cognitiveTier });
        this.hippocampus = new Hippocampus({ tier: brainConfig.memoryTier });
        
        this.target = null;
    }

    setTarget(vec3) {
        this.target = (vec3 instanceof THREE.Vector3) ? vec3.clone() : null;
    }
    
    setEstado(hormone) {
        this.limbic.estado = hormone;
    }

    /**
     * @param dt DeltaTime from DOM render
     * @param environment Context provided by 'world.js' (Gravity, Siblings)
     */
    update(dt, environment = {}) {
        if (!this.mesh) return;
        if (this.limbic.estado === States.MELATONIC) return; // Sleep bypass

        // 1. Soma(Limbic): Intención biológica cruda frente al entorno (World)
        const limbicOutput = this.limbic.processUrges(this.mesh.position, this.target, dt, environment);
        
        // 2. Psyche(Neocortex): Lógica Superior ejerce su Sello sobre la Carne
        let finalIntent = this.neocortex.applyCognition(limbicOutput.urgeVector, this.mesh.position, this.target);
        
        // 3. Neurotransmisión al Sistema Nervioso Autónomo
        let finalVelocityIntent = finalIntent.clone().multiplyScalar(this.reptilian.maxSpeed * limbicOutput.speedMod);
        this.reptilian.acceleration = limbicOutput.turnSmoothness; 
        
        // 4. Soma(Reptilian): Físicas de Motor limitadas por la Vasija (Gravedad/Suelo)
        this.reptilian.solveKinematics(this.mesh.position, finalVelocityIntent, dt);

        // 5. Propiocepción Cinética
        const vSq = this.reptilian.velocity.lengthSq();
        if (vSq > 0.01) {
            const targetRotation = Math.atan2(this.reptilian.velocity.x, this.reptilian.velocity.z);
            let diff = targetRotation - this.mesh.rotation.y;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * limbicOutput.turnSmoothness * dt;
        }
    }
}
