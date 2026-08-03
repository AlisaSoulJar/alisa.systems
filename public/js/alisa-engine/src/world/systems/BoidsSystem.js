import { SteeringSystem } from '../../psyche/SteeringSystem.js';
import * as THREE from 'three';

// BoidsSystem.js - Pure Headless Boids Flocking Logic (Reynolds)

export class BoidsSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {number} config.separationRadius 
     * @param {number} config.alignmentRadius 
     * @param {number} config.cohesionRadius 
     * @param {number} config.maxSpeed 
     * @param {number} config.maxForce 
     */
    constructor(config = {}) {
        this.separationRadius = config.separationRadius || 1.5;
        this.alignmentRadius = config.alignmentRadius || 4.0;
        this.cohesionRadius = config.cohesionRadius || 4.0;
        
        this.maxSpeed = config.maxSpeed || 5.0;
        this.maxForce = config.maxForce || 0.05;
        
        this.bounds = config.bounds || { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    }

    /**
     * TENSEGRITY BRIDGE: Bind THREE.js meshes to purely mathematical boid states.
     * @param {number} count 
     * @param {Object} bounds 
     * @param {Array} proxyMeshes Optional pre-generated meshes from EnvironmentFactory
     */
    initAgents(count, bounds, proxyMeshes = []) {
        this.bounds = bounds;
        this.flock = [];
        this.meshes = [];

        for (let i = 0; i < count; i++) {
            // Pure Math State
            this.flock.push({
                id: i,
                position: { 
                    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
                    y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
                    z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
                },
                velocity: {
                    x: (Math.random() - 0.5) * this.maxSpeed,
                    y: (Math.random() - 0.5) * this.maxSpeed,
                    z: (Math.random() - 0.5) * this.maxSpeed
                }
            });

            // Proxy Body (Tensegrity Hook)
            if (proxyMeshes[i]) {
                const mesh = proxyMeshes[i];
                mesh.position.set(this.flock[i].position.x, this.flock[i].position.y, this.flock[i].position.z);
                this.meshes.push(mesh);
            }
        }
    }

    /**
     * Call every frame in the render loop dt
     */
    update(dt, predator = null, target = null) {
        if (!this.flock) return;
        
        // 1. Calculate next pure state
        const nextStates = this.tick(this.flock, predator, target, dt);
        
        // 2. Map pure state back to proxy meshes
        for (let i = 0; i < this.flock.length; i++) {
            this.flock[i] = nextStates[i];
            
            if (this.meshes[i]) {
                const mesh = this.meshes[i];
                mesh.position.set(this.flock[i].position.x, this.flock[i].position.y, this.flock[i].position.z);
                
                // Calculate look direction
                const lookAtVec = new THREE.Vector3(
                    this.flock[i].position.x + this.flock[i].velocity.x,
                    this.flock[i].position.y + this.flock[i].velocity.y,
                    this.flock[i].position.z + this.flock[i].velocity.z
                );
                mesh.lookAt(lookAtVec);
            }
        }
    }

    /**
     * Computes the next state of the flock utilizing the generalized ECS SteeringSystem
     */
    tick(flock, predator = null, target = null, dt = 0.016) {
        const nextStates = [];
        
        const config = {
            sepR: this.separationRadius,
            aliR: this.alignmentRadius,
            cohR: this.cohesionRadius,
            maxSpeed: this.maxSpeed,
            maxForce: this.maxForce
        };

        for (let i = 0; i < flock.length; i++) {
            const boid = flock[i];
            
            // Core Flocking from ECS component
            let flockForce = SteeringSystem.calculateFlocking(boid, flock, config);
            
            // Flee Predator ECS component
            let fleeForce = {x:0, y:0, z:0};
            if (predator) {
                let pArray = Array.isArray(predator) ? predator : [predator];
                for (let p of pArray) {
                    let f = SteeringSystem.flee(boid, p.position, p.power, this.maxSpeed, this.maxForce);
                    fleeForce.x += f.x * 2.5; 
                    fleeForce.z += f.z * 2.5;
                }
            }
            
            // Seek Target ECS component
            let seekForce = {x:0, y:0, z:0};
            if (target) {
                let s = SteeringSystem.seek(boid, target.position, target.power, this.maxSpeed, this.maxForce);
                seekForce.x += s.x * 2.0; 
                seekForce.z += s.z * 2.0;
            }

            // Combine forces
            const force = {
                x: flockForce.x + fleeForce.x + seekForce.x,
                y: flockForce.y + fleeForce.y + seekForce.y,
                z: flockForce.z + fleeForce.z + seekForce.z
            };

            // Apply kinematics
            let vx = boid.velocity.x + force.x;
            let vy = boid.velocity.y + force.y;
            let vz = boid.velocity.z + force.z;

            // Speed limit check
            const speedSq = vx*vx + vy*vy + vz*vz;
            if (speedSq > this.maxSpeed * this.maxSpeed) {
                const speed = Math.sqrt(speedSq);
                vx = (vx / speed) * this.maxSpeed;
                vy = (vy / speed) * this.maxSpeed;
                vz = (vz / speed) * this.maxSpeed;
            }

            // Bounce box logic 
            let px = boid.position.x + (vx * dt);
            let py = boid.position.y + (vy * dt);
            let pz = boid.position.z + (vz * dt);

            if (px < this.bounds.minX || px > this.bounds.maxX) vx *= -1;
            if (pz < this.bounds.minZ || pz > this.bounds.maxZ) vz *= -1;

            // ⚠️ La caja NO encerraba en Y. `initAgents` usa minY/maxY para
            // repartir la bandada al nacer, y luego nadie los volvía a mirar:
            // ni rebote ni recorte. En una escena abierta la bandada se escapa
            // por arriba y por abajo y no vuelve — medido en El Andén, con las
            // almas entre -48 y +43 m de altura mientras el huevo está a 11.
            // Solo actúa si el que llama declaró límites verticales.
            if (this.bounds.minY !== undefined && this.bounds.maxY !== undefined) {
                if (py < this.bounds.minY || py > this.bounds.maxY) vy *= -1;
                py = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, py));
            }

            px = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, px));
            pz = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, pz));

            nextStates.push({
                id: boid.id,
                position: { x: px, y: py, z: pz },
                velocity: { x: vx, y: vy, z: vz }
            });
        }
        
        return nextStates;
    }
}
