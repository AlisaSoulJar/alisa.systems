import { SteeringSystem } from '../../psyche/SteeringSystem.js';

/**
 * BoidsSystem.js - Pure Headless Boids Flocking Logic (Reynolds)
 *
 * ⚠️ SIN `import * as THREE`, Y ESO ES LO QUE LO HACE UTILIZABLE.
 *
 * El fichero se anunciaba como «pure headless» y arrastraba el motor de render
 * en la primera línea. Con eso no se puede importar desde Node —ni desde una
 * prueba, ni desde un banco de medidas— aunque el noventa por ciento del código
 * sea matemática pura que no lo necesita.
 *
 * Es el **segundo tipo de bloqueo** que separa este motor de ser medible, y no
 * lo había contado: el primero es el azar sin semilla, éste es traerse el
 * renderizador al importar. Los dos tienen la misma causa —se escribió para una
 * demo, donde THREE siempre está— y los dos se arreglan sin tocar la lógica.
 *
 * Aquí sobraba entero: sólo se usaba para construir un vector y pasárselo a
 * `mesh.lookAt`, que acepta tres números desde siempre.
 */

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
        // Semilla inyectable: sin ella una bandada no se puede volver a volar
        // igual, y un entorno que no se repite no se puede verificar. Por
        // defecto, el comportamiento de siempre. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
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
                    x: bounds.minX + this.rng() * (bounds.maxX - bounds.minX),
                    y: bounds.minY + this.rng() * (bounds.maxY - bounds.minY),
                    z: bounds.minZ + this.rng() * (bounds.maxZ - bounds.minZ)
                },
                velocity: {
                    x: (this.rng() - 0.5) * this.maxSpeed,
                    y: (this.rng() - 0.5) * this.maxSpeed,
                    z: (this.rng() - 0.5) * this.maxSpeed
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
                
                // Mira hacia donde va. `lookAt` acepta (x, y, z) sueltos, así que
                // no hace falta construir un Vector3 —ni, por tanto, importar el
                // motor de render en un fichero de matemáticas.
                mesh.lookAt(
                    this.flock[i].position.x + this.flock[i].velocity.x,
                    this.flock[i].position.y + this.flock[i].velocity.y,
                    this.flock[i].position.z + this.flock[i].velocity.z
                );
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
