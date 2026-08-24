// TrafficSurvivalEngine.js
import { IDMSystem } from './IDMSystem.js'; // was './IDMEngine.js' — renamed Engine→System in the migration

export class TrafficSurvivalSystem {
    /**
     * @param {Object} [config]
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible road:
     *        mismas averías, mismos giros de aceite, mismas huidas de hurón.
     */
    constructor(config = {}) {
        this.ROAD_WIDTH = config.roadWidth || 32;
        this.ROAD_LENGTH = config.roadLength || 100;
        this.SPAWN_X = this.ROAD_LENGTH / 2 + 5;
        this.LANES = config.lanes || [];
        this.rng = config.rng || (() => Math.random());

        this.idmEngine = new IDMSystem({ laneTolerance: 2.5, lookAhead: 20, laneGapCheck: 10, rng: this.rng });

        this.cars = [];
        this.frogs = [];
        this.ferrets = [];
        this.oilSpills = [];
        this.wrecks = [];

        this.stats = { active: 0, squished: 0, crossed: 0, crashes: 0, ferretKills: 0, ferretsRunOver: 0 };

        // Callbacks for visual bridges
        this.onEvent = config.onEvent || (() => {});
    }

    // ─────────────────────────────────────────────────────────
    // ENTITY REGISTRATION
    // ─────────────────────────────────────────────────────────
    addCar(state) {
        // state: { id, x, y, z, rY, dir, speed, baseSpeed, followDist, brakeSensitivity, laneChangeChance, laneZ, laneType, isRaptor, personality, sizeX, sizeZ }
        state.braking = false;
        state.brakeFactor = 1.0;
        state.honkTimer = 0;
        state.honking = false;
        state.wrecked = false;
        state.wreckTimer = 0;
        state.brokenDown = false;
        state.breakdownTimer = 0;
        state.breakdownChance = state.isRaptor ? 0 : 0.0002;
        state.oilSpin = 0;
        this.cars.push(state);
    }

    addFrog(state) {
        // state: { id, x, y, z, actionPhase, timer, state, jumpStartX, jumpStartZ, targetX, targetZ }
        this.frogs.push(state);
        this.stats.active++;
    }

    addFerret(state) {
        // state: { id, x, y, z, rY, speed, state, targetX, targetZ, homeZ, patrolTimer, stamina, dead, hopPhase }
        this.ferrets.push(state);
    }

    addOilSpill(state) {
        // state: { id, x, z, radius, life }
        this.oilSpills.push(state);
    }

    // ─────────────────────────────────────────────────────────
    // MAIN LOOP (Tick)
    // ─────────────────────────────────────────────────────────
    tick(dt) {
        this._tickCars(dt);
        this._tickWrecksAndEnvironment(dt);
        this._tickFerrets(dt);
        this._tickFrogs(dt);
    }

    _tickCars(dt) {
        // 1. Prepare IDM Input
        const idmInput = [];
        const idmObstacles = this.wrecks.map(w => ({ x: w.x, z: w.z }));

        for (let car of this.cars) {
            if (car.wrecked || car.brokenDown) continue;
            idmInput.push(car);
        }

        // 2. IDM Solve
        const idmResults = this.idmEngine.tickMultiLane(idmInput, this.LANES, idmObstacles, dt);
        const idmMap = new Map();
        for (const r of idmResults) idmMap.set(r.id, r);

        // 3. Apply physics & hazards
        for (let car of this.cars) {
            if (car.wrecked || car.brokenDown) continue;

            // Breakdown
            if (!car.isRaptor && this.rng() < car.breakdownChance) {
                car.brokenDown = true;
                car.breakdownTimer = 6 + this.rng() * 8;
                car.speed = 0;
                car.brakeFactor = 0;
            }

            // Oil Spill Check
            car.oilSpin *= 0.95;
            for (let oil of this.oilSpills) {
                const dx = Math.abs(car.x - oil.x);
                const dz = Math.abs(car.z - oil.z);
                if (dx < oil.radius && dz < oil.radius) {
                    car.oilSpin = (this.rng() - 0.5) * 3.0; // Spin rads/sec
                    car.brakeFactor = 0.4;
                }
            }
            if (Math.abs(car.oilSpin) > 0.1) {
                car.rY -= car.oilSpin * dt;
            }

            // Ambulance yield logic
            if (car.personality !== 'ambulance') {
                for (let other of this.cars) {
                    if (other.personality !== 'ambulance') continue;
                    if (Math.abs(other.z - car.z) > 3) continue;
                    const dx = (other.x - car.x) * other.dir;
                    if (dx < 0 && dx > -20) {
                        const currentLane = this._findLaneByZ(car.z);
                        const currentIdx = this.LANES.indexOf(currentLane);
                        const yieldLane = currentIdx > 0 ? this.LANES[currentIdx - 1] : 
                                         (currentIdx < this.LANES.length - 1 ? this.LANES[currentIdx + 1] : null);
                        if (yieldLane) car.laneZ = yieldLane.z;
                        car.brakeFactor = Math.min(car.brakeFactor, 0.5);
                    }
                }
            }

            // Sync from IDM
            const res = idmMap.get(car.id);
            if (res) {
                car.brakeFactor = res.brakeFactor;
                car.braking = res.braking;
                if (res.laneChange !== null) {
                    car.laneZ = res.laneChange;
                }
            }

            // Lerp lane position Z
            car.z += (car.laneZ - car.z) * 3 * dt;

            // Collision check: raptor
            for (let other of this.cars) {
                if (other === car || other.wrecked) continue;
                if (!other.isRaptor && !car.isRaptor) continue;
                const dx = Math.abs(other.x - car.x);
                const dz = Math.abs(other.z - car.z);
                const hitDist = (other.sizeZ + car.sizeZ) / 2 * 0.6;
                const hitLane = (other.sizeX + car.sizeX) / 2 * 0.5;
                if (dx < hitDist && dz < hitLane && !car.isRaptor) {
                    this._wreckCar(car);
                }
            }

            // Collision check: normal car to car
            if (!car.isRaptor && !car.wrecked) {
                for (let other of this.cars) {
                    if (other === car || other.isRaptor || other.wrecked) continue;
                    const dx = Math.abs(other.x - car.x);
                    const dz = Math.abs(other.z - car.z);
                    if (dx < 2.5 && dz < 2.0) {
                        const victim = (car.speed >= other.speed) ? other : car;
                        if (!victim.wrecked) {
                            this._wreckCar(victim);
                        }
                    }
                }
            }

            // Honk near frogs
            car.honkTimer -= dt;
            for (let f of this.frogs) {
                const fx = Math.abs(f.x - car.x);
                const fz = Math.abs(f.z - car.z);
                if (fx < 8 && fz < 3 && car.honkTimer <= 0) {
                    car.honking = true;
                    car.honkTimer = 2.0;
                    this.onEvent('honk', { x: car.x, z: car.z });
                }
            }
            if (car.honkTimer <= 0) car.honking = false;

            // Move X
            car.speed = car.baseSpeed * car.brakeFactor;
            car.x += car.dir * car.speed * dt;

            // Wrap around X
            if (car.x > this.SPAWN_X) { car.x = -this.SPAWN_X; car.needsVisualReset = true; }
            if (car.x < -this.SPAWN_X) { car.x = this.SPAWN_X; car.needsVisualReset = true; }
        }
    }

    _wreckCar(car) {
        car.wrecked = true;
        car.wreckTimer = 4.0;
        car.speed = 0;
        car.rY += (this.rng() - 0.5) * 1.2;
        car.rZ = (this.rng() - 0.5) * 0.3;
        this.wrecks.push(car);
        this.stats.crashes++;
        this.onEvent('crash', { x: car.x, z: car.z });
    }

    _tickWrecksAndEnvironment(dt) {
        // Wrecks sinking & despawning
        for (let i = this.wrecks.length - 1; i >= 0; i--) {
            const w = this.wrecks[i];
            w.wreckTimer -= dt;
            if (w.wreckTimer < 1.0) {
                w.y -= dt * 1.5;
            }
            if (w.wreckTimer <= 0) {
                this.wrecks.splice(i, 1);
                const idx = this.cars.indexOf(w);
                if (idx > -1) this.cars.splice(idx, 1);
                this.onEvent('despawn_car', { id: w.id });
                // We emit an event to request respawning
                this.onEvent('respawn_car', {});
            }
        }

        // Breakdowns blinking
        for (let car of this.cars) {
            if (!car.brokenDown) continue;
            car.breakdownTimer -= dt;
            car.visible = (Math.floor(car.breakdownTimer * 3) % 2 === 0);
            if (car.breakdownTimer <= 0) {
                car.brokenDown = false;
                car.brakeFactor = 1.0;
                car.visible = true;
            }
        }

        // Oil spills lifespan
        for (let i = this.oilSpills.length - 1; i >= 0; i--) {
            const o = this.oilSpills[i];
            o.life -= dt;
            if (o.life <= 0) {
                this.oilSpills.splice(i, 1);
                this.onEvent('despawn_oil', { id: o.id });
                this.onEvent('respawn_oil', {});
            }
        }
    }

    _tickFerrets(dt) {
        const FERRET_SPEED_PATROL = 2.5;
        const FERRET_SPEED_CHASE = 9.0;
        const FERRET_SIGHT = 25.0;
        const FERRET_KILL_DIST = 1.3;

        for (let fe of this.ferrets) {
            if (fe.dead) {
                fe.deathTimer -= dt;
                fe.rZ += dt * 2; // spin
                if (fe.deathTimer < 1) fe.y -= dt * 1.0; // sink
                if (fe.deathTimer <= 0) {
                    this.onEvent('despawn_ferret', { id: fe.id });
                    this.ferrets.splice(this.ferrets.indexOf(fe), 1);
                    this.onEvent('respawn_ferret', {});
                }
                continue;
            }

            // Nearest Frog
            let nearestFrog = null, minFrogDist = Infinity;
            for (let f of this.frogs) {
                const dx = fe.x - f.x, dz = fe.z - f.z;
                const d = Math.sqrt(dx*dx + dz*dz);
                if (d < minFrogDist) { minFrogDist = d; nearestFrog = f; }
            }

            // Danger from cars
            let carDanger = false, nearestCarDist = Infinity;
            for (let car of this.cars) {
                if (car.wrecked || car.brokenDown) continue;
                const cdx = Math.abs(car.x - fe.x);
                const cdz = Math.abs(car.z - fe.z);
                if (cdx < 12 && cdz < 3) {
                    carDanger = true;
                    const d = Math.sqrt(cdx*cdx + cdz*cdz);
                    if (d < nearestCarDist) nearestCarDist = d;
                }
            }

            // State Machine
            switch (fe.state) {
                case 'patrol':
                    fe.patrolTimer -= dt;
                    if (fe.patrolTimer <= 0) {
                        fe.targetX = fe.x + (this.rng() - 0.5) * 30;
                        fe.targetX = Math.max(-this.ROAD_LENGTH/2, Math.min(this.ROAD_LENGTH/2, fe.targetX));
                        fe.targetZ = fe.homeZ + (this.rng() - 0.5) * 6;
                        fe.patrolTimer = 2 + this.rng() * 4;
                    }
                    fe.speed = FERRET_SPEED_PATROL;
                    if (nearestFrog && minFrogDist < FERRET_SIGHT) {
                        fe.state = 'chase';
                        fe.preyTarget = nearestFrog;
                    }
                    break;
                case 'chase':
                    if (!fe.preyTarget || !this.frogs.includes(fe.preyTarget)) {
                        fe.state = 'patrol';
                        fe.patrolTimer = 1;
                        break;
                    }
                    fe.targetX = fe.preyTarget.x;
                    fe.targetZ = fe.preyTarget.z;
                    fe.speed = FERRET_SPEED_CHASE;
                    fe.stamina -= dt * 15;
                    
                    if (minFrogDist < FERRET_KILL_DIST) {
                        this.stats.ferretKills++;
                        this.onEvent('ferret_kill', { x: fe.preyTarget.x, z: fe.preyTarget.z, targetId: fe.preyTarget.id });
                        fe.state = 'patrol';
                        fe.preyTarget = null;
                        fe.patrolTimer = 2;
                        fe.stamina = Math.min(100, fe.stamina + 30);
                        break;
                    }

                    if (fe.stamina <= 0 || (carDanger && nearestCarDist < 5)) {
                        fe.state = 'flee';
                        fe.fleeTimer = 1.5 + this.rng();
                    }
                    break;
                case 'flee':
                    fe.targetZ = fe.homeZ;
                    fe.targetX = fe.x + (this.rng() - 0.5) * 10;
                    fe.speed = FERRET_SPEED_CHASE * 1.2;
                    fe.fleeTimer -= dt;
                    fe.stamina += dt * 20;
                    if (fe.fleeTimer <= 0 && Math.abs(fe.z - fe.homeZ) < 5) {
                        fe.state = 'patrol';
                        fe.patrolTimer = 3;
                        if (fe.stamina < 0) fe.stamina = 0;
                    }
                    break;
            }

            // Apply movement
            const dx = fe.targetX - fe.x, dz = fe.targetZ - fe.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist > 0.5) {
                const nx = dx / dist, nz = dz / dist;
                fe.x += nx * fe.speed * dt;
                fe.z += nz * fe.speed * dt;
                fe.rY = Math.atan2(nx, nz);
                fe.hopPhase += dt * (fe.speed * 3);
            }

            // Squish check against cars
            if (Math.abs(fe.z) <= this.ROAD_WIDTH/2 + 2) {
                for (let car of this.cars) {
                    if (car.wrecked || car.brokenDown) continue;
                    const hitX = Math.abs(car.x - fe.x) < (car.sizeZ/2 + 0.5);
                    const hitZ = Math.abs(car.z - fe.z) < (car.sizeX/2 + 0.5);
                    if (hitX && hitZ) {
                        fe.dead = true;
                        fe.deathTimer = 3.0;
                        fe.speed = 0;
                        fe.rX = Math.PI / 2; // Flat
                        this.stats.ferretsRunOver++;
                        this.onEvent('ferret_squish', { x: fe.x, z: fe.z });
                        break;
                    }
                }
            }
        }
    }

    _tickFrogs(dt) {
        const FROG_SPEED = 12.0;
        for (let f of this.frogs) {
            
            // Reached goal?
            if (f.z < -this.ROAD_WIDTH/2) {
                this.stats.crossed++;
                this.onEvent('frog_cross', { id: f.id });
                continue;
            }

            if (f.state === 'wait') {
                f.timer -= dt;
                if (f.timer <= 0) {
                    // Start jump logic
                    let nextZ = f.z - 4;
                    let prevZ = f.z + 4;
                    let nextX_L = f.x - 4;
                    let nextX_R = f.x + 4;

                    let dangerNext = false, dangerCurrent = false, dangerL = false, dangerR = false;
                    
                    if (nextX_L < -this.ROAD_LENGTH/2) dangerL = true;
                    if (nextX_R > this.ROAD_LENGTH/2) dangerR = true;

                    for (let car of this.cars) {
                        if (car.wrecked || car.brokenDown) continue;
                        let dx = car.x - f.x;
                        let approaching = (dx * car.dir < 0);

                        if (Math.abs(car.z - nextZ) < 1.0) {
                            if (Math.abs(dx) < 6 || (approaching && Math.abs(dx) < 14)) dangerNext = true;
                        }

                        if (Math.abs(car.z - f.z) < 1.0) {
                            if (Math.abs(dx) < 5 || (approaching && Math.abs(dx) < 12)) dangerCurrent = true;
                            let dxL = car.x - nextX_L;
                            let dxR = car.x - nextX_R;
                            let appL = (dxL * car.dir < 0);
                            let appR = (dxR * car.dir < 0);
                            if (Math.abs(dxL) < 5 || (appL && Math.abs(dxL) < 12)) dangerL = true;
                            if (Math.abs(dxR) < 5 || (appR && Math.abs(dxR) < 12)) dangerR = true;
                        }
                    }

                    // Ferret danger
                    for (let fe of this.ferrets) {
                        if (fe.dead) continue;
                        const fdx = fe.x - f.x, fdz = fe.z - f.z;
                        if (Math.sqrt(fdx*fdx + fdz*fdz) < 8) {
                            if (fdz < -1) dangerNext = true;
                            if (fdz > 1) dangerCurrent = true;
                            if (fdx < -1) dangerL = true;
                            if (fdx > 1) dangerR = true;
                            f.timer = 0; // Panic
                        }
                    }

                    const doHop = (tz, tx, ry) => {
                        f.state = 'jump';
                        f.jumpStartX = f.x;
                        f.jumpStartZ = f.z;
                        f.targetZ = tz;
                        f.targetX = tx;
                        f.rY = ry;
                        f.actionPhase = 0;
                        this.onEvent('frog_jump', { id: f.id });
                    };

                    if (!dangerNext) {
                        doHop(nextZ, f.x, Math.PI);
                    } else if (dangerCurrent) {
                        if (!dangerL && !dangerR) {
                            if (this.rng() > 0.5) doHop(f.z, nextX_L, -Math.PI/2);
                            else doHop(f.z, nextX_R, Math.PI/2);
                        } else if (!dangerL) {
                            doHop(f.z, nextX_L, -Math.PI/2);
                        } else if (!dangerR) {
                            doHop(f.z, nextX_R, Math.PI/2);
                        } else {
                            doHop(prevZ, f.x, 0); // Retreat
                        }
                    } else {
                        f.timer = 0.5 + this.rng() * 0.5; // Wait
                    }
                }
            } else if (f.state === 'jump') {
                // Moving
                const dx = f.targetX - f.x;
                const dz = f.targetZ - f.z;
                const d = Math.sqrt(dx*dx + dz*dz);
                
                if (d < FROG_SPEED * dt) {
                    f.x = f.targetX;
                    f.z = f.targetZ;
                    f.state = 'wait';
                    f.timer = 0.1 + this.rng() * 0.4;
                    this.onEvent('frog_land', { id: f.id });
                } else {
                    f.x += (dx/d) * FROG_SPEED * dt;
                    f.z += (dz/d) * FROG_SPEED * dt;
                }
            }

            // Check squished
            for (let car of this.cars) {
                if (car.wrecked || car.brokenDown) continue;
                if (Math.abs(car.z - f.z) < 2.0 && Math.abs(car.x - f.x) < (car.sizeZ/2 + 0.4)) {
                    this.stats.squished++;
                    this.onEvent('frog_squish', { id: f.id, x: f.x, z: f.z });
                    break; // Removed logic here, we just emit an event to reset the frog
                }
            }
        }
    }

    _findLaneByZ(z) {
        let best = this.LANES[0], minD = Infinity;
        for (const l of this.LANES) {
            const d = Math.abs(l.z - z);
            if (d < minD) { minD = d; best = l; }
        }
        return best;
    }
}
