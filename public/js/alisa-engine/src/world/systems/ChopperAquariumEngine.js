import { ECSWorld } from '../OverworldECS.js';
import { EnergySystem, EnergyComponent } from './EnergySystem.js';
import { EcosystemSystem } from './EcosystemSystem.js';
import { PheromoneGrid } from './PheromoneGrid.js';
import { SeededRNG } from '../core/SeededRNG.js';

export class ChopperAquariumEngine {
    constructor() {
        this.listeners = {};

        // Configuration
        this.totalFloors = 18;
        this.FL_H = 4.0;
        this.TANK_SIZE = 120;
        this.TANK_HEIGHT = this.totalFloors * this.FL_H + 40;
        
        // State
        this.gameState = { playing: false, ended: false, activeFloor: -1, isAI: true };
        
        // ECS integration
        this.ecs = new ECSWorld();
        this.energySys = new EnergySystem();
        this.ecs.addSystem(this.energySys.update.bind(this.energySys), ['EnergyComponent']);
        this.chopperEntity = this.ecs.createEntity();
        
        this.chopper = { x: 40.0, y: (this.totalFloors * this.FL_H)/2.0, z: 40.0, rotY: 0.0 };
        this.chopperVelocity = { x: -10.0, y: 0.0, z: 10.0 };
        this.chopperTracking = { tx: 40.0, ty: (this.totalFloors * this.FL_H)/2.0, tz: 40.0 };
        this.maxSpeed = 25.0;
        
        this.chopperState = { mode: 'ROAM', targetFloor: -1, stateTimer: 1.0, scannedFloors: new Set() };
        
        this.targetFloorInfo = { index: -1 };
        
        this.time = 0.0;
        
        // Ecosystem Integration
        this.ecosystem = new EcosystemSystem();
        this.pheromoneGrid = new PheromoneGrid(this.TANK_SIZE, this.TANK_HEIGHT, this.TANK_SIZE, 8.0, 5.0);
        this.fishes = [];
        this.hunters = [];
        this.sharks = [];
        this.plankton = [];
        this.ecosystemCorals = [];
        this.ecosystemJellyfishes = [];
        
        this.rng = new SeededRNG(42);
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    
    emit(event, ...args) {
        if (this.listeners[event]) {
            for (let cb of this.listeners[event]) cb(...args);
        }
    }

    reset(seed = 42) {
        this.gameState = { playing: true, ended: false, activeFloor: -1, isAI: true };
        this.ecs.addComponent(this.chopperEntity, 'EnergyComponent', EnergyComponent({
            maxEnergy: 100, currentEnergy: 100, drainRate: 0, hasDevice: true, isOn: true
        }));
        
        this.chopper = { x: 40.0, y: (this.totalFloors * this.FL_H)/2.0, z: 40.0, rotY: 0.0 };
        this.chopperVelocity = { x: -10.0, y: 0.0, z: 10.0 };
        this.chopperTracking = { tx: 40.0, ty: (this.totalFloors * this.FL_H)/2.0, tz: 40.0 };
        this.chopperState = { mode: 'ROAM', targetFloor: -1, stateTimer: 1.0, scannedFloors: new Set() };
        this.time = 0.0;
        
        this.rng = new SeededRNG(seed);
        this.targetFloorInfo.index = Math.floor(this.rng.next() * (this.totalFloors - 2)) + 1;

        // Reset Ecosystem
        this.pheromoneGrid = new PheromoneGrid(this.TANK_SIZE, this.TANK_HEIGHT, this.TANK_SIZE, 8.0, 5.0);
        const S = this.TANK_SIZE;
        this.fishes = Array.from({ length: 25 }, (_, i) => ({
            id: `f_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 10+this.rng.next()*40, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 2, timer: 0, stamina: 100, alive: true, score: 0
        }));
        this.hunters = Array.from({ length: 4 }, (_, i) => ({
            id: `h_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 10+this.rng.next()*40, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 4, timer: 0, energy: 100, alive: true, score: 0
        }));
        this.sharks = Array.from({ length: 2 }, (_, i) => ({
            id: `s_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 5+this.rng.next()*20, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 3, timer: 0, alive: true, score: 0
        }));

        this.emit('reset_visuals');
    }

    // Math utilities to avoid THREE.js dependency
    vecLength(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
    vecNormalize(v) { 
        let l = this.vecLength(v); 
        if(l>0) { v.x/=l; v.y/=l; v.z/=l; }
        return v;
    }
    vecDot(v1, v2) { return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z; }

    checkFloor(floorIdx) {
        if(this.gameState.ended || floorIdx === -1) return;
        if(this.chopperState.scannedFloors.has(floorIdx)) return;
        
        this.gameState.activeFloor = floorIdx;
        this.chopperState.scannedFloors.add(floorIdx);

        const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');

        if(floorIdx === this.targetFloorInfo.index) {
            this.emit('floor_checked', { floorIdx, success: true });
            this.winSequence();
        } else {
            if (energy) energy.currentEnergy = Math.max(0, energy.currentEnergy - 5);
            this.emit('floor_checked', { floorIdx, success: false, fuel: energy ? energy.currentEnergy : 0 });
            if(energy && energy.currentEnergy <= 0) {
                this.crashSequence();
            }
        }
    }

    winSequence() {
        this.gameState.playing = false; 
        this.gameState.ended = true;
        this.emit('game_over', { success: true });
    }

    crashSequence() {
        this.gameState.playing = false; 
        this.gameState.ended = true;
        this.emit('game_over', { success: false });
    }

    stepSimulation(actionIdx, dt, isRLMode = true) {
        if(this.gameState.ended) {
            return { obs: this.getObservationVector(), reward: 0, done: true, info: { target: this.targetFloorInfo.index } };
        }

        let thrust = { x: 0, y: 0, z: 0 };
        let rlYawVelocity = 0.0;

        if (isRLMode) {
            if(actionIdx === 1) thrust.z = -1; if(actionIdx === 2) thrust.z = 1;
            if(actionIdx === 3) thrust.x = -1; if(actionIdx === 4) thrust.x = 1;
            if(actionIdx === 5) thrust.y = 1; if(actionIdx === 6) thrust.y = -1;
            
            if(actionIdx === 7) rlYawVelocity = 2.0; 
            else if(actionIdx === 8) rlYawVelocity = -2.0; 
        }

        this.vecNormalize(thrust);
        this.chopperVelocity.x += thrust.x * 40 * dt;
        this.chopperVelocity.y += thrust.y * 40 * dt;
        this.chopperVelocity.z += thrust.z * 40 * dt;

        this.executeLogicTick(dt, isRLMode ? (actionIdx > 0 && actionIdx < 7) : false, rlYawVelocity);

        // Calculate a dummy RL reward (to be hooked manually if needed)
        let r = 0;
        return { obs: this.getObservationVector(), reward: r, done: this.gameState.ended, info: { target: this.targetFloorInfo.index } };
    }

    getObservationVector() {
        const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');
        const currentFuel = energy ? energy.currentEnergy : 0;
        
        const fCount = this.fishes ? this.fishes.filter(f => f.alive).length : 0;
        const hCount = this.hunters ? this.hunters.filter(h => h.alive).length : 0;
        const sCount = this.sharks ? this.sharks.filter(s => s.alive).length : 0;
        
        const obs = [
            currentFuel/100, 
            this.chopper.x/100, 
            (this.chopper.y - 2)/(this.totalFloors * this.FL_H), 
            this.chopper.z/100, 
            Math.sin(this.chopper.rotY), 
            this.gameState.activeFloor !== -1 ? this.gameState.activeFloor/this.totalFloors : 0, 
            this.gameState.activeFloor !== -1 ? 1 : 0,
            fCount / 25.0,
            hCount / 4.0,
            sCount / 2.0
        ];
        return { 
            obs: obs, 
            meta: { 
                fuel: currentFuel, 
                activeFloor: this.gameState.activeFloor, 
                targetFloor: this.targetFloorInfo.index, 
                buildingHeight: this.totalFloors * this.FL_H,
                ecosystem_fishes: fCount,
                ecosystem_hunters: hCount,
                ecosystem_sharks: sCount,
                pheromones: this.pheromoneGrid.getState()
            } 
        };
    }

    executeLogicTick(dt, manualThrust = false, rlYawVelocity = 0.0) {
        this.ecs.tick(dt);
        this.time += dt;

        if(this.gameState.playing) {
            // AUTONOMOUS AI
            if (!manualThrust && this.gameState.isAI) {
                let acc = { x: 0, y: 0, z: 0 };

                if(this.chopperState.mode === 'ROAM') {
                    this.chopperState.stateTimer -= dt;
                    if(this.chopperState.stateTimer <= 0) {
                        let availableFloors = [];
                        for(let i=0; i<this.totalFloors; i++) {
                            if(!this.chopperState.scannedFloors.has(i)) availableFloors.push(i);
                        }
                        if(availableFloors.length > 0) {
                            this.chopperState.targetFloor = availableFloors[Math.floor(this.rng.next() * availableFloors.length)];
                            this.chopperState.mode = 'APPROACH';
                        }
                    }
                }

                if(this.chopperState.mode === 'ROAM') {
                    const orbitRadius = 45; const orbitSpeed = 0.5; 
                    const yOffset = (this.totalFloors * this.FL_H / 2) + Math.sin(this.time * 0.4) * ((this.totalFloors * this.FL_H / 3));
                    const targetX = Math.cos(this.time * orbitSpeed) * orbitRadius; 
                    const targetZ = Math.sin(this.time * orbitSpeed) * orbitRadius;
                    
                    let dir = { x: targetX - this.chopper.x, y: yOffset - this.chopper.y, z: targetZ - this.chopper.z };
                    this.vecNormalize(dir);
                    acc.x += dir.x * 15; acc.y += dir.y * 15; acc.z += dir.z * 15;
                }
                else if(this.chopperState.mode === 'APPROACH') {
                    if(this.chopperState.targetFloor !== -1 && this.chopperState.scannedFloors.has(this.chopperState.targetFloor)) {
                        this.chopperState.mode = 'ROAM'; this.chopperState.stateTimer = 0.2;
                    } else {
                        let floorY = (this.chopperState.targetFloor * this.FL_H) + (this.FL_H/2);
                        let angle = Math.atan2(this.chopper.z, this.chopper.x);
                        let hoverDist = 28;
                        let targetX = Math.cos(angle) * hoverDist;
                        let targetZ = Math.sin(angle) * hoverDist;
                        let dir = { x: targetX - this.chopper.x, y: floorY - this.chopper.y, z: targetZ - this.chopper.z };
                        
                        if(this.vecLength(dir) < 5.0 && this.vecLength(this.chopperVelocity) < 12.0) {
                            this.chopperState.mode = 'INSPECTING';
                            this.chopperState.stateTimer = 1.5;
                            this.gameState.activeFloor = this.chopperState.targetFloor;
                            this.emit('start_inspecting', this.chopperState.targetFloor);
                        } else {
                            this.vecNormalize(dir);
                            acc.x += dir.x * 35; acc.y += dir.y * 35; acc.z += dir.z * 35;
                            this.chopperVelocity.x *= 0.92; this.chopperVelocity.y *= 0.92; this.chopperVelocity.z *= 0.92;
                        }
                    }
                }
                else if(this.chopperState.mode === 'INSPECTING') {
                    if(this.chopperState.targetFloor !== -1 && this.chopperState.scannedFloors.has(this.chopperState.targetFloor)) {
                        this.chopperState.mode = 'ROAM'; this.chopperState.stateTimer = 0.1;
                        this.gameState.activeFloor = -1;
                    } else {
                        this.chopperState.stateTimer -= dt;
                        let floorY = (this.chopperState.targetFloor * this.FL_H) + (this.FL_H/2);
                        let angle = Math.atan2(this.chopper.z, this.chopper.x);
                        let hoverDist = 40;
                        let targetX = Math.cos(angle) * hoverDist;
                        let targetZ = Math.sin(angle) * hoverDist;
                        
                        let dir = { x: targetX - this.chopper.x, y: floorY - this.chopper.y, z: targetZ - this.chopper.z };
                        this.vecNormalize(dir);
                        acc.x += dir.x * 15; acc.y += dir.y * 15; acc.z += dir.z * 15;
                        this.chopperVelocity.x *= 0.8; this.chopperVelocity.y *= 0.8; this.chopperVelocity.z *= 0.8;
                        
                        if(this.chopperState.stateTimer <= 0) {
                            this.checkFloor(this.chopperState.targetFloor);
                            if(!this.gameState.ended) {
                                this.chopperState.mode = 'ROAM';
                                this.chopperState.stateTimer = 1.0 + this.rng.next();
                                this.chopperState.targetFloor = -1;
                                this.gameState.activeFloor = -1;
                            }
                        }
                    }
                }

                // Avoid Center
                let distToCenter = Math.sqrt(this.chopper.x*this.chopper.x + this.chopper.z*this.chopper.z);
                if(distToCenter < 28) {
                    let push = { x: this.chopper.x, y: 0, z: this.chopper.z };
                    this.vecNormalize(push);
                    acc.x += push.x * 40; acc.z += push.z * 40;
                }

                // Avoid bounds
                let wallDist = 12;
                if(this.chopper.x < -this.TANK_SIZE/2 + wallDist) acc.x += 25;
                if(this.chopper.x > this.TANK_SIZE/2 - wallDist) acc.x -= 25;
                if(this.chopper.z < -this.TANK_SIZE/2 + wallDist) acc.z += 25;
                if(this.chopper.z > this.TANK_SIZE/2 - wallDist) acc.z -= 25;
                if(this.chopper.y < wallDist) acc.y += 25;
                if(this.chopper.y > this.TANK_HEIGHT - wallDist) acc.y -= 25;

                this.chopperVelocity.x += acc.x * dt;
                this.chopperVelocity.y += acc.y * dt;
                this.chopperVelocity.z += acc.z * dt;
            }

            // Damping
            this.chopperVelocity.x *= 0.95;
            this.chopperVelocity.y *= 0.95;
            this.chopperVelocity.z *= 0.95;

            // Speed clamp
            let speedSq = this.chopperVelocity.x*this.chopperVelocity.x + this.chopperVelocity.y*this.chopperVelocity.y + this.chopperVelocity.z*this.chopperVelocity.z;
            if(speedSq > this.maxSpeed*this.maxSpeed) {
                let f = this.maxSpeed / Math.sqrt(speedSq);
                this.chopperVelocity.x *= f; this.chopperVelocity.y *= f; this.chopperVelocity.z *= f;
            }

            // Target Pos tracker
            this.chopperTracking.tx += this.chopperVelocity.x * dt;
            this.chopperTracking.ty += this.chopperVelocity.y * dt;
            this.chopperTracking.tz += this.chopperVelocity.z * dt;

            let spd = 6.0;
            this.chopper.x += (this.chopperTracking.tx - this.chopper.x) * spd * dt;
            this.chopper.y += (this.chopperTracking.ty - this.chopper.y) * spd * dt;
            this.chopper.z += (this.chopperTracking.tz - this.chopper.z) * spd * dt;

            this.chopper.rotY += rlYawVelocity * dt;
        } else if (this.gameState.ended) {
            const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');
            // Simple physics end sequence
            if (energy && energy.currentEnergy <= 0) {
                // crash
                this.chopper.y -= 20 * dt;
                if(this.chopper.y < 1.0) this.chopper.y = 1.0;
            } else {
                // win hover
                let landPos = { x: 0, y: (this.totalFloors * this.FL_H) + 1.2, z: 0 };
                this.chopper.x += (landPos.x - this.chopper.x) * 2.0 * dt;
                this.chopper.y += (landPos.y - this.chopper.y) * 2.0 * dt;
                this.chopper.z += (landPos.z - this.chopper.z) * 2.0 * dt;
            }
        }

        // Tick Ecosystem
        if (this.gameState.playing) {
            const TANK = { width: this.TANK_SIZE, depth: this.TANK_SIZE, waterLevel: this.TANK_HEIGHT, EAT_RADIUS: 2.0, maxPlankton: 50 };
            
            this.pheromoneGrid.tick(dt);

            // Note: Plankton visually handled by ParticleEmitter, but we could add mathematical plankton if needed for foraging logic.
            // For now, fish will just flock and evade predators.
            this.fishes = this.ecosystem.tickFishes(this.fishes, this.hunters, this.sharks, this.plankton, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
            this.hunters = this.ecosystem.tickHunters(this.hunters, this.fishes, this.sharks, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
            this.sharks = this.ecosystem.tickSharks(this.sharks, this.hunters, this.fishes, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
        }
    }
}
