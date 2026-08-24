import * as THREE from 'three';

// KatamariSystem.js - Headless Volumetric Mass Assimilation Engine
export class KatamariSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to scatter the same prey field twice.
     */
    constructor(config = {}) {
        this.absorptionFactor = config.absorptionFactor || 0.1;
        this.minVolumeDiff = config.minVolumeDiff || 1.1;
        this.baseDensity = config.baseDensity || 1.0;
        this.chunkCount = config.chunkCount || 2000;
        // Semilla inyectable. Sin ella `init()` esparce los dos mil chunks de
        // presa en posiciones distintas cada vez y la misma partida no se puede
        // volver a jugar. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());

        // Effects state
        this.screenShake = 0.0;
        
        // Input state
        this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
        this.agentInput = { x: 0, z: 0 };
        this._bindKeys();
    }
    
    applyAction(inputX, inputZ) {
        this.agentInput.x = inputX;
        this.agentInput.z = inputZ;
    }

    getState() {
        return {
            corePosition: this.corePosition,
            coreRotation: this.coreRotation,
            katamariRadius: this.katamariRadius,
            preyData: this.preyData,
            screenShake: this.screenShake,
            
            // RL observation data
            core: {
                x: parseFloat(this.corePosition.x.toFixed(2)),
                y: parseFloat(this.corePosition.y.toFixed(2)),
                z: parseFloat(this.corePosition.z.toFixed(2)),
                volume: parseFloat(this.katamariCoreVolume.toFixed(2)),
                radius: parseFloat(this.katamariRadius.toFixed(2))
            },
            attachedCount: this.preyData.filter(p => p.attached).length
        };
    }

    _bindKeys() {
        if (typeof document === 'undefined') return;
        document.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true;
        });
        document.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
        });
    }

    init() {
        this.katamariCoreVolume = 10;
        this.katamariRadius = this._radiusFromVolume(this.katamariCoreVolume);
        
        this.corePosition = new THREE.Vector3(0, this.katamariRadius, 0);
        this.coreRotation = new THREE.Euler(0, 0, 0);
        
        this.preyData = [];
        
        for(let i = 0; i < this.chunkCount; i++) {
            const rx = (this.rng() - 0.5) * 80;
            const ry = this.rng() * 40 + 5;
            const rz = (this.rng() - 0.5) * 80;

            this.preyData.push({
                id: i,
                position: new THREE.Vector3(rx, ry, rz),
                velocity: new THREE.Vector3((this.rng()-0.5)*10, (this.rng()-0.5)*10, (this.rng()-0.5)*10),
                rotation: new THREE.Euler(this.rng(), this.rng(), this.rng()),
                volume: 0.5,
                radius: this._radiusFromVolume(0.5),
                active: true,
                attached: false,
                attachQuat: new THREE.Quaternion().random(),
                attachDist: 0
            });
        }
    }

    update(dt) {
        // Player Input for Core Movement
        const speed = 20.0;
        let dx = this.agentInput.x * speed * dt;
        let dz = this.agentInput.z * speed * dt;
        
        if (this.keys.KeyW) dz -= speed * dt;
        if (this.keys.KeyS) dz += speed * dt;
        if (this.keys.KeyA) dx -= speed * dt;
        if (this.keys.KeyD) dx += speed * dt;
        
        // Reset agent input
        this.agentInput.x = 0;
        this.agentInput.z = 0;
        
        this.corePosition.x += dx;
        this.corePosition.z += dz;
        
        // Rolling rotation based on movement
        this.coreRotation.x += dz * 0.2;
        this.coreRotation.z -= dx * 0.2;
        
        // Keep core grounded based on its current radius
        this.corePosition.y = this.katamariRadius;
        
        const predator = {
            id: 'core',
            position: this.corePosition,
            volume: this.katamariCoreVolume,
            radius: this.katamariRadius
        };
        
        const activePreyList = this.preyData.filter(p => p.active && !p.attached);
        const result = this.processCollisions(predator, activePreyList);
        
        this.katamariCoreVolume = result.newPredatorVolume;
        this.katamariRadius = result.newPredatorRadius;
        
        // Attach absorbed
        if (result.absorbedIds.length > 0) {
            this.screenShake += result.absorbedIds.length * 0.5; // Add shake intensity
            if (this.screenShake > 5.0) this.screenShake = 5.0; // Cap it
        }

        for(let i = 0; i < result.absorbedIds.length; i++) {
            const id = result.absorbedIds[i];
            const p = this.preyData[id];
            p.attached = true;
            p.attachDist = this.katamariRadius;
        }
        
        // Update Swarm
        for(let i = 0; i < this.preyData.length; i++) {
            const p = this.preyData[i];
            if(!p.active) continue;
            
            if(!p.attached) {
                // Free floating swarm behavior
                p.position.x += p.velocity.x * dt;
                p.position.y += p.velocity.y * dt;
                p.position.z += p.velocity.z * dt;
                
                // Swarm limits
                if (p.position.x > 50 || p.position.x < -50) p.velocity.x *= -1;
                if (p.position.y > 50 || p.position.y < 5) p.velocity.y *= -1;
                if (p.position.z > 50 || p.position.z < -50) p.velocity.z *= -1;
                
                p.rotation.x += dt;
                p.rotation.y += dt;
            }
        }
        
        this.screenShake *= Math.pow(0.1, dt); // Decay quickly
    }

    processCollisions(predator, preyList) {
        let currentVol = predator.volume;
        const absorbedIds = [];
        const remainingPrey = [];
        let currentRadius = predator.radius || this._radiusFromVolume(currentVol);

        for (let i = 0; i < preyList.length; i++) {
            const prey = preyList[i];
            
            const dx = predator.position.x - prey.position.x;
            const dy = predator.position.y - prey.position.y;
            const dz = predator.position.z - prey.position.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            
            const preyRadius = prey.radius || this._radiusFromVolume(prey.volume);
            const collisionDistSq = (currentRadius + preyRadius) * (currentRadius + preyRadius);

            if (distSq < collisionDistSq) {
                if (currentVol >= prey.volume * this.minVolumeDiff) {
                    currentVol += prey.volume * this.absorptionFactor;
                    currentRadius = this._radiusFromVolume(currentVol);
                    absorbedIds.push(prey.id);
                } else if (prey.volume >= currentVol * this.minVolumeDiff) {
                    return { predatorEatenBy: prey.id, newPredatorVolume: 0, newPredatorRadius: 0, absorbedIds: [], remainingPrey: preyList };
                } else {
                    remainingPrey.push(prey);
                }
            } else {
                remainingPrey.push(prey);
            }
        }

        return {
            newPredatorVolume: currentVol,
            newPredatorRadius: currentRadius,
            absorbedIds,
            remainingPrey
        };
    }

    _volumeFromRadius(r) { return (4.0 / 3.0) * Math.PI * (r * r * r); }
    _radiusFromVolume(v) { return Math.cbrt(v / ((4.0 / 3.0) * Math.PI)); }
}

