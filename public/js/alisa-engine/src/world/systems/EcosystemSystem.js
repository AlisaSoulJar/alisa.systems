/**
 * ECOSYSTEM SYSTEM (STIGMERGIC BIOLOGY UPGRADE)
 * ----------------------------------------------------
 * Pure ES6 Headless Mathematical System for biological behaviors.
 * Foraging, Fleeing, Hunting, Schooling (Boids), and Metabolism.
 * Upgraded to use O(1) Spatial Pheromone Grids instead of O(N^2) distances.
 */
import { FlockingSystem, SHOAL } from './FlockingSystem.js';

export class EcosystemSystem {

    /**
     * @param {Object} [config]
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible run.
     *
     * ⚠️ POR QUÉ ESTE PARÁMETRO, Y POR QUÉ AHORA.
     *
     * Este sistema llamaba a `this.rng()` en veintidós sitios. Para una demo
     * de peces nadando eso está perfecto; para cualquier cosa que tenga que
     * REPETIRSE —una tirada de banco de pruebas, un informe de fallo, el recibo
     * de una partida— lo deja inservible: misma semilla, otro ecosistema.
     *
     * Medido en todo el motor: **54 sistemas, 28 con azar incontrolado, 1 con
     * semilla inyectable**. Y la consecuencia se ve en el catálogo — los 27
     * juegos usan UNA pieza del motor de 179, no porque las demás sean malas
     * sino porque no se pueden medir.
     *
     * No es un defecto de diseño repetido veintiocho veces: es que el motor se
     * escribió para demos y nadie le había pedido nunca repetibilidad. Cuesta
     * cuatro líneas y no rompe a quien ya lo llamaba, porque el valor por
     * defecto es exactamente el comportamiento de antes.
     */
    constructor(config = {}) {
        this.rng = config.rng || (() => Math.random());
    }

    // --- HELPER MATH ---

    clampToTank(pos, TANK) {
        const halfW = TANK.width / 2 - 0.5;
        const halfD = TANK.depth / 2 - 0.5;
        if (pos.x > halfW) pos.x = halfW;
        if (pos.x < -halfW) pos.x = -halfW;
        if (pos.z > halfD) pos.z = halfD;
        if (pos.z < -halfD) pos.z = -halfD;
        if (pos.y > TANK.waterLevel - 0.5) pos.y = TANK.waterLevel - 0.5;
        if (pos.y < 1.0) pos.y = 1.0;
    }

    wallDeflect3D(target, pos, TANK) {
        const WS = 3.0;
        const halfW = TANK.width / 2 - 0.5;
        const halfD = TANK.depth / 2 - 0.5;
        const WL = TANK.waterLevel - 1;
        if (target.x > halfW - WS)  target.x -= 4;
        if (target.x < -halfW + WS) target.x += 4;
        if (target.z > halfD - WS)  target.z -= 4;
        if (target.z < -halfD + WS) target.z += 4;
        if (target.y > WL - 1) target.y -= 3;
        if (target.y < 2)      target.y += 3;
    }

    avoidObstacles3D(pos, dir, obstacles, isAgile = false) {
        let isDodging = false;
        for (let obj of obstacles) {
            const dx = pos.x - obj.x;
            const dy = pos.y - obj.y;
            const dz = pos.z - obj.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const r = obj.r || 1.5;
            const detectionRadius = r + (isAgile ? 3.0 : 1.5);
            if (dist < detectionRadius && dist > 0.0001) {
                isDodging = true;
                const rawPush = (detectionRadius - dist) * (isAgile ? 1.2 : 0.8);
                const push = Math.min(rawPush, isAgile ? 2.5 : 1.5);
                dir.x += (dx / dist) * push;
                dir.y += (dy / dist) * push * (isAgile ? 1.2 : 0.5);
                dir.z += (dz / dist) * push;
            }
        }
        return isDodging;
    }

    getDistanceSq(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx*dx + dy*dy + dz*dz;
    }

    getDistance(a, b) {
        return Math.sqrt(this.getDistanceSq(a, b));
    }

    // --- SUB-ENGINES ---

    tickPlankton(planktonArr, dt, TANK, t) {
        let out = [];
        for (let i = 0; i < planktonArr.length; i++) {
            let p = planktonArr[i];
            if (!p.alive) continue;

            p.phase += dt * 0.5;
            let targetY = p.baseY + Math.sin(p.phase) * p.ampY;
            p.y += (targetY - p.y) * dt;

            p.x += Math.sin(p.phase * 0.7) * 0.5 * dt;
            p.z += Math.cos(p.phase * 0.9) * 0.5 * dt;

            this.clampToTank(p, TANK);

            p.spawnTimer -= dt;
            if (p.spawnTimer <= 0) {
                p.spawnTimer = 6.0 + this.rng() * 4.0;
                if (planktonArr.length < TANK.maxPlankton && this.rng() > 0.3) {
                    p.spawnTrigger = true; 
                }
            }
            out.push(p);
        }
        return out;
    }

    tickFishes(fishes, hunters, sharks, plankton, jellyfishes, corals, dt, t, TANK, grid) {
        let out = [];
        for (let i = 0; i < fishes.length; i++) {
            let f = fishes[i];
            if (!f.alive) continue;

            f.timer -= dt;

            // STIGMERGY: Los peces emiten olor a comida que atrae a los cazadores.
            if (grid && !f.isHidden) grid.addPheromone(f.x, f.y, f.z, 'food', dt * 10);

            /**
             * LA BANDADA, QUE YA NO VIVE AQUÍ.
             *
             * Eran cuarenta líneas de Reynolds con los pesos escritos a mano en
             * medio del bucle, entre la estigmergia y el metabolismo. Ahora es
             * `FlockingSystem` con los números en `SHOAL`: la ley fuera, los
             * parámetros con nombre, y este bucle vuelve a hablar sólo de peces.
             *
             * Se movió sin cambiar una milésima —mismo orden de operaciones— y lo
             * comprueba la huella del submarino, que no se movió.
             */
            const banco = FlockingSystem.force(f, fishes, SHOAL, (a, b) => this.getDistanceSq(a, b));
            const flockCount = banco.count;
            const bx = banco.x, by = banco.y, bz = banco.z;

            // HIDE LOGIC
            if (f.hideCooldown > 0) {
                f.hideCooldown -= dt;
                f.hideTimer = 0;
            } else {
                let foundHide = false;
                for(let h of jellyfishes) {
                    if (this.getDistanceSq(f, h) < (h.r*h.r)) {
                        foundHide = true;
                        f.currentHideSpot = h;
                        break;
                    }
                }
                if (foundHide) {
                    f.isHidden = true;
                    f.hideTimer += dt;
                    if (f.hideTimer > 4.0) {
                        f.hideCooldown = 6.0;
                        f.isHidden = false;
                        if (f.currentHideSpot) {
                            let ex = f.x - f.currentHideSpot.x;
                            let ey = f.y - f.currentHideSpot.y;
                            let ez = f.z - f.currentHideSpot.z;
                            let elen = Math.sqrt(ex*ex + ey*ey + ez*ez) || 1;
                            ex = (ex/elen)*3.5; ey = (ey/elen)*3.5; ez = (ez/elen)*3.5;
                            f.x += ex; f.y += ey; f.z += ez;
                            this.clampToTank(f, TANK);
                            f.tx = f.x + ex*2; f.ty = f.y + ey*2; f.tz = f.z + ez*2;
                            this.clampToTank({x:f.tx, y:f.ty, z:f.tz}, TANK);
                            f.speed = 6.0; f.timer = 0.5; f.state = 'wander';
                        }
                    }
                } else {
                    f.isHidden = false;
                    f.hideTimer = Math.max(0, f.hideTimer - dt);
                }
            }

            if (f.isHidden) {
                f.state = 'hide';
                f.stamina = Math.min(100, f.stamina + dt*35);
                f.exhausted = false;
                f.speed = 0;
                out.push(f);
                continue;
            }

            // EAT PLANKTON
            let nearestP = null, pDistSq = Infinity;
            for(let p of plankton) {
                if (!p.alive) continue;
                let dSq = this.getDistanceSq(f, p);
                if (dSq < pDistSq) { pDistSq = dSq; nearestP = p; }
            }

            if (nearestP && pDistSq < (TANK.EAT_RADIUS * TANK.EAT_RADIUS)) {
                f.eatTriggerId = nearestP.id; 
                f.stamina = Math.min(100, f.stamina + 25);
                f.exhausted = false;
                f.score++;
                nearestP.alive = false; 
            } else {
                f.eatTriggerId = null;
            }

            // PREDATORS (Stigmergic Evasion)
            let isFleeing = false;
            let dangerInfo = grid ? grid.getGradient(f.x, f.y, f.z, 'danger') : { value: 0, dir: {x:0, y:0, z:0} };

            // Si huele el peligro (tiburón/hunter), huye en dirección contraria al gradiente.
            if (dangerInfo.value > 0.5) { 
                isFleeing = true;
                f.state = 'flee';
                
                let safeHide = null, safeDistSq = Infinity;
                if (f.hideCooldown <= 0) {
                    for (let spot of jellyfishes) {
                        let dSq = this.getDistanceSq(f, spot);
                        if (dSq < safeDistSq && dSq < 2025.0) { safeDistSq = dSq; safeHide = spot; } // dist < 45
                    }
                }

                if (safeHide) {
                    f.tx = safeHide.x; f.ty = safeHide.y; f.tz = safeHide.z;
                    f.speed = f.exhausted ? 4.5 : 12.0;
                    f.timer = 0.3;
                } else {
                    let tp = t * 3; 
                    // Corre en sentido CONTRARIO a la dirección del gradiente de peligro
                    let ex = -dangerInfo.dir.x;
                    let ey = -dangerInfo.dir.y * 0.4;
                    let ez = -dangerInfo.dir.z;
                    let elen = Math.sqrt(ex*ex + ey*ey + ez*ez) || 1;
                    ex = ex/elen + Math.sin(tp)*0.8;
                    ez = ez/elen + Math.cos(tp*0.7)*0.8;
                    let elen2 = Math.sqrt(ex*ex + ey*ey + ez*ez) || 1;
                    
                    let targetObj = { x: f.x + (ex/elen2)*6, y: f.y + (ey/elen2)*6, z: f.z + (ez/elen2)*6 };
                    this.wallDeflect3D(targetObj, f, TANK);
                    this.clampToTank(targetObj, TANK);
                    f.tx = targetObj.x; f.ty = targetObj.y; f.tz = targetObj.z;
                    f.speed = f.exhausted ? 3.0 : 8.5;
                    f.timer = 0.3;
                }
            } else if (nearestP && pDistSq < 144) { // dist < 12
                f.state = 'forage';
                if (f.timer <= 0) {
                    f.tx = nearestP.x + (this.rng()-0.5)*0.5;
                    f.ty = nearestP.y + (this.rng()-0.5)*0.5;
                    f.tz = nearestP.z + (this.rng()-0.5)*0.5;
                    f.timer = 0.3 + this.rng()*0.5;
                    f.speed = 2.5 + this.rng()*2.0;
                }
            } else if (f.timer <= 0) {
                f.state = 'wander';
                f.tx = (this.rng()-0.5)*TANK.width*0.6;
                f.ty = 2.0 + this.rng()*(TANK.waterLevel - 4.0);
                f.tz = (this.rng()-0.5)*TANK.depth*0.6;
                f.speed = 1.0 + this.rng()*1.5;
                f.timer = 2 + this.rng()*4;
            }

            // STAMINA
            if (isFleeing) {
                f.stamina -= dt * 9;
                if (f.stamina <= 0) { f.stamina = 0; f.exhausted = true; }
            } else {
                f.stamina += dt * (f.exhausted ? 25 : 15);
                if (f.stamina >= 100) { f.stamina = 100; f.exhausted = false; }
            }
            let activeSpeed = f.speed * (f.exhausted ? 0.5 : 1.0);

            // KINEMATICS
            let dx = f.tx - f.x;
            let dy = f.ty - f.y;
            let dz = f.tz - f.z;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist > 0.3) {
                dx /= dist; dy /= dist; dz /= dist;
                if (f.state !== 'flee' && flockCount > 0) {
                    dx += bx; dy += by; dz += bz;
                    let blen = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
                    dx /= blen; dy /= blen; dz /= blen;
                }
                
                let dirObj = {x: dx, y: dy, z: dz};
                this.avoidObstacles3D(f, dirObj, corals, false);
                
                let dirLenSq = dirObj.x*dirObj.x + dirObj.y*dirObj.y + dirObj.z*dirObj.z;
                if (dirLenSq > 0.01) {
                    let dirLen = Math.sqrt(dirLenSq);
                    dirObj.x /= dirLen; dirObj.y /= dirLen; dirObj.z /= dirLen;
                    
                    // Lerp velocity
                    f.vx += (dirObj.x - f.vx) * (6 * dt);
                    f.vy += (dirObj.y - f.vy) * (6 * dt);
                    f.vz += (dirObj.z - f.vz) * (6 * dt);
                    
                    let velLen = Math.sqrt(f.vx*f.vx + f.vy*f.vy + f.vz*f.vz) || 1;
                    f.vx /= velLen; f.vy /= velLen; f.vz /= velLen;
                    
                    f.x += f.vx * activeSpeed * dt;
                    f.y += f.vy * activeSpeed * dt;
                    f.z += f.vz * activeSpeed * dt;
                }
            }
            this.clampToTank(f, TANK);
            out.push(f);
        }
        return out;
    }

    tickHunters(hunters, fishes, sharks, jellyfishes, corals, dt, t, TANK, grid) {
        let out = [];
        for (let i = 0; i < hunters.length; i++) {
            let h = hunters[i];
            if (!h.alive) continue;
            
            h.timer -= dt;

            // STIGMERGY: Los Hunters emiten peligro (pero cazan comida)
            if (grid) grid.addPheromone(h.x, h.y, h.z, 'danger', dt * 10);
            
            // STIGMERGIC HUNTING (Olfato)
            let foodInfo = grid ? grid.getGradient(h.x, h.y, h.z, 'food') : { value: 0, dir: {x:0, y:0, z:0} };
            let dangerInfo = grid ? grid.getGradient(h.x, h.y, h.z, 'danger') : { value: 0, dir: {x:0, y:0, z:0} };

            // O(N) Check for actual biting only (much cheaper than vector analysis of all fishes)
            let nearestPrey = null, preyDistSq = Infinity;
            for (let f of fishes) {
                if (!f.alive || f.isHidden) continue;
                let dSq = this.getDistanceSq(h, f);
                if (dSq < preyDistSq) { preyDistSq = dSq; nearestPrey = f; }
            }

            // BITE LOGIC
            if (nearestPrey && preyDistSq < (TANK.EAT_RADIUS * TANK.EAT_RADIUS)) {
                h.eatTriggerId = nearestPrey.id;
                h.score++;
                h.stamina = Math.min(100, h.stamina + 20);
                h.exhausted = false;
                nearestPrey.alive = false; 
                h.bloodTrigger = {x: nearestPrey.x, y: nearestPrey.y, z: nearestPrey.z};
            } else {
                h.eatTriggerId = null;
                h.bloodTrigger = null;
            }

            let isFleeing = false;
            let obstacles = [...corals];

            // Si detecta peligro extremo (tiburones emiten +30, hunters emiten +10), huye
            if (dangerInfo.value > 15.0) { 
                isFleeing = true;
                h.state = 'flee';
                h.energy -= dt * 4;
                
                let ex = -dangerInfo.dir.x;
                let ey = -dangerInfo.dir.y * 0.4;
                let ez = -dangerInfo.dir.z;
                let elen = Math.sqrt(ex*ex + ey*ey + ez*ez) || 1;
                let targetObj = { x: h.x + (ex/elen)*12, y: h.y + (ey/elen)*12, z: h.z + (ez/elen)*12 };
                
                this.wallDeflect3D(targetObj, h, TANK);
                this.clampToTank(targetObj, TANK);
                h.tx = targetObj.x; h.ty = targetObj.y; h.tz = targetObj.z;
                h.speed = h.exhausted ? 4.5 : 12.0;
                h.timer = 0.3;
            } else if (foodInfo.value > 0.5) { // Si huele comida, sigue el rastro
                h.state = 'hunt';
                h.energy -= dt * 2.5;
                if (h.timer <= 0) {
                    h.tx = h.x + foodInfo.dir.x * 6;
                    h.ty = h.y + foodInfo.dir.y * 6;
                    h.tz = h.z + foodInfo.dir.z * 6;
                    h.speed = h.exhausted ? 3.5 : 8.5;
                    h.timer = 0.4;
                }
            } else if (h.timer <= 0) {
                h.state = 'patrol';
                h.energy += dt * 5;
                let W = TANK.width, D = TANK.depth, WL = TANK.waterLevel;
                h.tx = (this.rng()-0.5)*W*0.6;
                h.ty = 3.0 + this.rng()*(WL-5.0);
                h.tz = (this.rng()-0.5)*D*0.6;
                h.speed = 1.2 + this.rng()*2.0;
                h.timer = 2 + this.rng()*4;
            }

            if (h.energy <= 0) { h.energy = 0; h.exhausted = true; }
            if (h.energy >= 100) { h.energy = 100; h.exhausted = false; }
            
            // JELLYFISH AVOIDANCE FOR HUNTER
            obstacles = [...corals, ...jellyfishes];

            let dx = h.tx - h.x, dy = h.ty - h.y, dz = h.tz - h.z;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist > 0.5) {
                let dirObj = {x: dx/dist, y: dy/dist, z: dz/dist};
                this.avoidObstacles3D(h, dirObj, obstacles, false);
                let dirLen = Math.sqrt(dirObj.x*dirObj.x + dirObj.y*dirObj.y + dirObj.z*dirObj.z);
                if (dirLen > 0) {
                    dirObj.x /= dirLen; dirObj.y /= dirLen; dirObj.z /= dirLen;
                    h.vx += (dirObj.x - h.vx) * (3 * dt);
                    h.vy += (dirObj.y - h.vy) * (3 * dt);
                    h.vz += (dirObj.z - h.vz) * (3 * dt);
                    
                    let velLen = Math.sqrt(h.vx*h.vx + h.vy*h.vy + h.vz*h.vz) || 1;
                    h.vx /= velLen; h.vy /= velLen; h.vz /= velLen;
                    
                    h.x += h.vx * h.speed * dt;
                    h.y += h.vy * h.speed * dt;
                    h.z += h.vz * h.speed * dt;
                }
            }
            this.clampToTank(h, TANK);
            out.push(h);
        }
        return out;
    }

    tickSharks(sharks, hunters, fishes, jellyfishes, corals, dt, t, TANK, grid) {
        let out = [];
        for (let i = 0; i < sharks.length; i++) {
            let s = sharks[i];
            if (!s.alive) continue;
            
            s.timer -= dt;

            // STIGMERGY: Apex Predator emits heavy danger
            if (grid) grid.addPheromone(s.x, s.y, s.z, 'danger', dt * 30);

            // Target actual biting only (O(N) locally instead of physics tracking)
            let nearestH = null, hDistSq = Infinity;
            for (let h of hunters) {
                if (!h.alive) continue;
                let dSq = this.getDistanceSq(s, h);
                if (dSq < hDistSq) { hDistSq = dSq; nearestH = h; }
            }

            let nearestF = null, fDistSq = Infinity;
            for (let f of fishes) {
                if (!f.alive || f.isHidden) continue;
                let dSq = this.getDistanceSq(s, f);
                if (dSq < fDistSq) { fDistSq = dSq; nearestF = f; }
            }

            if (nearestH && hDistSq < (TANK.EAT_RADIUS * 2.25)) { // dist < 1.5 * EAT_RADIUS
                s.eatTriggerTargetType = 'hunter';
                s.eatTriggerId = nearestH.id;
                nearestH.alive = false;
                s.score++;
                s.bloodTrigger = {x: nearestH.x, y: nearestH.y, z: nearestH.z};
            } else if (nearestF && fDistSq < (TANK.EAT_RADIUS * 2.25)) {
                s.eatTriggerTargetType = 'fish';
                s.eatTriggerId = nearestF.id;
                nearestF.alive = false;
                s.score++;
                s.bloodTrigger = {x: nearestF.x, y: nearestF.y, z: nearestF.z};
            } else {
                s.eatTriggerId = null;
                s.bloodTrigger = null;
            }

            // STIGMERGIC HUNTING
            let foodInfo = grid ? grid.getGradient(s.x, s.y, s.z, 'food') : { value: 0, dir: {x:0, y:0, z:0} };

            // Hunt if it smells fish/hunters (food scent)
            if (foodInfo.value > 0.5) { 
                s.state = 'hunt';
                if (s.timer <= 0) {
                    s.tx = s.x + foodInfo.dir.x * 10; 
                    s.ty = s.y + foodInfo.dir.y * 10; 
                    s.tz = s.z + foodInfo.dir.z * 10;
                    s.speed = 10.0;
                    s.timer = 0.5;
                }
            } else if (s.timer <= 0) {
                s.state = 'patrol';
                let W = TANK.width, D = TANK.depth, WL = TANK.waterLevel;
                // Stick near bottom/mid
                s.tx = (this.rng()-0.5)*W*0.8;
                s.ty = 3.0 + this.rng()*(WL/2);
                s.tz = (this.rng()-0.5)*D*0.8;
                s.speed = 1.8 + this.rng();
                s.timer = 4 + this.rng()*4;
            }

            let dx = s.tx - s.x, dy = s.ty - s.y, dz = s.tz - s.z;
            let distSq = dx*dx + dy*dy + dz*dz;
            if (distSq > 1.0) {
                let dist = Math.sqrt(distSq);
                let dirObj = {x: dx/dist, y: dy/dist, z: dz/dist};
                this.avoidObstacles3D(s, dirObj, [...corals, ...jellyfishes], false);
                
                let dirLenSq = dirObj.x*dirObj.x + dirObj.y*dirObj.y + dirObj.z*dirObj.z;
                if (dirLenSq > 0) {
                    let dirLen = Math.sqrt(dirLenSq);
                    dirObj.x /= dirLen; dirObj.y /= dirLen; dirObj.z /= dirLen;
                    
                    s.vx += (dirObj.x - s.vx) * (1.5 * dt); // slow turn
                    s.vy += (dirObj.y - s.vy) * (1.5 * dt);
                    s.vz += (dirObj.z - s.vz) * (1.5 * dt);
                    
                    let velLenSq = s.vx*s.vx + s.vy*s.vy + s.vz*s.vz;
                    if (velLenSq > 0) {
                        let velLen = Math.sqrt(velLenSq);
                        s.vx /= velLen; s.vy /= velLen; s.vz /= velLen;
                    }
                    
                    s.x += s.vx * s.speed * dt;
                    s.y += s.vy * s.speed * dt;
                    s.z += s.vz * s.speed * dt;
                }
            }
            this.clampToTank(s, TANK);
            out.push(s);
        }
        return out;
    }
}
