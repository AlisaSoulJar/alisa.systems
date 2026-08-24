/**
 * ALISA Sovereign Matrix Engine: ORBITAL KINEMATICS
 * Pure mathematical simulation for headless RL Shmup environments.
 * Decouples collisions, inertia, and spatial updates from WebGL.
 */

export class OrbitalKinematicsSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator for reproducible mine/spawn timers.
     */
    constructor(config = {}) {
        // Universal Arena Bounds
        this.arenaW = config.arenaW || 120;
        this.arenaH = config.arenaH || 60;
        this.globalZ = config.globalZ || 0;
        // Semilla inyectable. Sin ella los temporizadores de mina y de generación
        // de enjambre dan una partida distinta con la misma semilla. Ver
        // `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
    }

    /**
     * Executes headless physics simulation for inanimate space debris.
     * @param {Array} asteroids - Mathematical states spanning positions, radii, and velocity
     * @param {number} dt - Delta time multiplier
     * @param {number} currentGlobalZ - Absolute progression of the scroll layer
     */
    tickAsteroids(asteroids, dt, currentGlobalZ) {
        this.globalZ = currentGlobalZ;
        
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            
            // Standard Euler integration
            a.x += (a.vx * dt);
            a.y += (a.vy * dt);
            a.z -= (a.vz * dt);

            a.rx += (a.rvx * dt);
            a.ry += (a.rvy * dt);
            a.rz += (a.rvz * dt);
            
            // Deterministic ping-pong bound logic for Monolith walls
            if (a.isMono && a.vx !== 0) {
                if (a.x > a.pingPongMaxX) { a.x = a.pingPongMaxX; a.vx *= -1; }
                if (a.x < a.pingPongMinX) { a.x = a.pingPongMinX; a.vx *= -1; }
            }
            
            // Piston dynamic vertical oscillation bounds
            if (a.isPiston) {
                a.phase += dt * a.speed;
                let swing = Math.sin(a.phase) * (this.arenaH * 0.4); 
                if (a.pDir > 0) swing = Math.abs(swing); else swing = -Math.abs(swing);
                
                let newY = a.anchorY + swing;
                // Bound check without THREE.js
                let limitY = Math.sign(a.anchorY) * (this.arenaH/2 + (this.arenaH * 0.8)/2 - 10);
                if (a.pDir < 0 && newY > limitY) newY = limitY;
                if (a.pDir > 0 && newY < limitY) newY = limitY;
                
                a.y = newY;
            }
            
            // Out of bounds GC flag
            if (a.z < this.globalZ - 30) {
                a.gc = true; // Mark for garbage collection by the host UI
            }
        }

        return asteroids;
    }

    /**
     * Executes headless physics for enemy swarms and AI.
     */
    tickEnemies(enemies, dt, globalZ, statsTime, shipState, asteroids) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            const tp = e.t;

            // Behavior switch
            if (tp === 'LINER') {
                e.z -= e.sp * dt;
            } else if (tp === 'POPCORN') {
                e.z -= e.sp * dt;
                // Boids mathematical approximation
                let cohX = 0, cohY = 0, sepX = 0, sepY = 0, bCount = 0;
                for (let j = 0; j < enemies.length; j++) {
                    let oe = enemies[j];
                    if (oe.id === e.id || oe.t !== 'POPCORN') continue;
                    let dx = e.x - oe.x; let dy = e.y - oe.y; let dz = e.z - oe.z;
                    let bd = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    if (bd < 10) {
                        bCount++; cohX += oe.x; cohY += oe.y;
                        if (bd < 3) {
                            let sdist = Math.sqrt(dx*dx + dy*dy) + 0.1;
                            sepX += dx/sdist; sepY += dy/sdist;
                        }
                    }
                }
                if (bCount > 0) {
                    cohX = (cohX/bCount - e.x) * 0.3;
                    cohY = (cohY/bCount - e.y) * 0.3;
                    e.x += (cohX + sepX*0.8) * dt * 3;
                    e.y += (cohY + sepY*0.8) * dt * 3;
                }
                e.x += Math.sin(statsTime * 8 + (e.sinePhase || 0)) * 1.5 * dt;
            } else if (tp === 'SWOOPER') {
                e.z -= e.sp * dt * 0.5;
                e.x += e.enterSide * e.sp * dt * 0.8;
                e.y += Math.sin(statsTime * 3 + (e.sinePhase || 0)) * (e.sineAmp || 10) * dt;
            } else if (tp === 'TRACKER' && shipState) {
                if (!shipState.inNebula) {
                    e.x += (shipState.x - e.x) * e.sp * dt * 0.1;
                    e.y += (shipState.y - e.y) * e.sp * dt * 0.1;
                }
                e.z -= e.sp * dt * 0.5;
            } else if (tp === 'CHARGER') {
                if (e.chargeState === 'approach') {
                    e.z -= e.sp * dt * 0.3;
                    if (shipState && e.z < globalZ + 80) {
                        e.chargeState = 'windup'; e.windupTimer = 0.6;
                        e.tx = shipState.x; e.ty = shipState.y;
                    }
                } else if (e.chargeState === 'windup') {
                    e.windupTimer -= dt;
                    e.z -= e.sp * dt * 0.05;
                    e.pulse = 1.5 + Math.sin(statsTime * 20) * 1.0;
                    if (e.windupTimer <= 0) e.chargeState = 'locked';
                } else {
                    let dx = e.tx - e.x; let dy = e.ty - e.y;
                    let dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
                    e.x += (dx/dist) * e.sp * dt; e.y += (dy/dist) * e.sp * dt;
                    e.z -= e.sp * dt;
                }
            } else if (tp === 'SNIPER') {
                e.z = Math.max(e.z - e.sp * dt, globalZ + 40);
            } else if (tp === 'BOMBER') {
                e.z -= e.sp * dt;
                e.x += Math.sin(statsTime * 0.5 + (e.sinePhase || 0)) * 3 * dt;
                e.mineTimer -= dt;
                if (e.mineTimer <= 0 && e.z > globalZ) {
                    e.mineTimer = 3 + this.rng() * 2;
                    e.spawnMine = true; // Signal frontend to spawn mine
                }
            } else if (tp === 'TURRET' || tp === 'CRAWLER') {
                if (tp === 'CRAWLER') {
                    if (e.vx === undefined) e.vx = 20;
                    e.x += e.vx * dt;
                    if (e.x > this.arenaW/2) { e.x = this.arenaW/2; e.vx = -e.vx; }
                    if (e.x < -this.arenaW/2) { e.x = -this.arenaW/2; e.vx = -e.vx; }
                }
            } else if (tp === 'CARRIER') {
                e.z -= e.sp * dt;
                e.spawnTimer -= dt;
                if (e.spawnTimer <= 0 && e.spawnCount < 8 && e.z > globalZ) {
                    e.spawnTimer = 3 + this.rng() * 2;
                    e.spawnCount++;
                    e.spawnPopcorn = true; // Signal frontend
                }
            } else if (tp === 'MIRROR') {
                if (shipState && !shipState.dead) {
                    e.x += (-shipState.x - e.x) * 5 * dt; // math lerp approx
                    e.y += (-shipState.y - e.y) * 5 * dt;
                    e.rz = shipState.rz; e.rx = -shipState.rx;
                }
                if (e.zOffset === undefined) e.zOffset = e.z - globalZ;
                e.zOffset += (40 - e.zOffset) * Math.min(1.0, 0.5 * dt); // math lerp approx
                e.z = globalZ + e.zOffset;
            } else {
                e.z -= (e.sp || 10) * dt;
            }

            // Repulsion from asteroids
            if (tp !== 'TURRET' && tp !== 'CRAWLER') {
                let apex_fx = 0, apex_fy = 0;
                for (let a of asteroids) {
                    let dz = a.z - e.z;
                    if (dz > -5 && dz < 25) {
                        let dx = e.x - a.x; let dy = e.y - a.y;
                        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz) - (a.radius || 1.5);
                        let avoidDist = a.isMono ? 25 : 12;
                        if (dist < avoidDist && dist > 0.1) {
                            let repel = (a.isMono ? 400 : 80) / (dist * dist + 0.1);
                            apex_fx += (dx/dist) * repel; apex_fy += (dy/dist) * repel;
                        }
                    }
                }
                e.x += apex_fx * dt;
                e.y += apex_fy * dt;

                // Arena containment
                e.x = Math.max(-this.arenaW/1.5, Math.min(this.arenaW/1.5, e.x));
                e.y = Math.max(-this.arenaH/1.5, Math.min(this.arenaH/1.5, e.y));

                // Reactive Banking
                e.rz += ((-apex_fx*0.05) - e.rz) * Math.min(1.0, 5*dt);
                e.rx += ((apex_fy*0.05) - e.rx) * Math.min(1.0, 5*dt);
            }

            // Firing Logic
            if (shipState && e.fireRate > 0) {
                e.fireT -= dt;
                let canSeeShip = !shipState.inNebula || (Math.sqrt((e.x-shipState.x)**2 + (e.y-shipState.y)**2 + (e.z-shipState.z)**2) < 15);
                
                let distToShip = Math.sqrt((e.x-shipState.x)**2 + (e.y-shipState.y)**2 + (e.z-shipState.z)**2);
                if (e.fireT <= 0 && e.z > globalZ && distToShip < 90) {
                    e.fireT = e.fireRate * (shipState.inNebula ? 2.5 : 1.0);
                    e.fireBullet = { canSee: canSeeShip }; // Signal frontend to spawn bullet
                }
            }

            // GC
            if (e.z < globalZ - 30 || e.x > this.arenaW*1.5 || e.x < -this.arenaW*1.5) {
                e.gc = true;
            }
        }
        return enemies;
    }

    /**
     * Executes headless physics for projectiles
     */
    tickProjectiles(bullets, dt, globalZ) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            let p = bullets[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.life -= dt;
            
            // Wobble for player 'spread' bullets
            if (p.isPlayer && p.wobble) {
                p.wobbleT = (p.wobbleT || 0) + dt;
                p.x += Math.sin(p.wobbleT * 15) * p.wobble * dt;
            }
            
            if (p.life <= 0 || p.z > globalZ + 150 || p.z < globalZ - 30) {
                p.gc = true;
            }
        }
        return bullets;
    }
}
