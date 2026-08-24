import { AsteroidsSystem, SHIP_GAUGES } from './AsteroidsSystem.js';
import { AsteroidsFactory } from '../factories/AsteroidsFactory.js';
import { MMOClient } from '../../soma/utils/MMOClient.js';
import * as THREE from 'three';

export { SHIP_GAUGES };

export class AsteroidsEngine {
    constructor(core, uiCallbacks, options = {}) {
        this.core = core;
        this.scene = core.scene;
        this.camera = core.camera;
        this.ui = uiCallbacks || {};
        this.telemetryEnabled = options.telemetryEnabled === true;
        this.telemetryClient = options.telemetryClient || MMOClient;
        
        /**
         * ⚠️ LA VARIEDAD LA PONE LA PUERTA HUMANA, NO EL MOTOR.
         *
         * `AsteroidsSystem` es determinista por construcción: sin semilla juega
         * siempre la misma partida. Eso es lo correcto para medir, y sería
         * horrible para quien se sienta a jugar. Así que la entropía la aporta
         * quien la necesita —aquí, del reloj— y el motor sigue sin conocer ni el
         * reloj ni el azar del sistema.
         */
        this.system = new AsteroidsSystem({ seed: (Date.now() & 0x7fffffff) >>> 0 });
        this.factory = new AsteroidsFactory(this.scene, this.camera);
        
        // Proxy metrics up so HTML UI doesn't break
        this.stats = this.system.stats;
        
        this.vAsteroids = new Map();
        this.vEnemies = new Map();
        this.vProjectiles = new Map();
        this.vItems = new Map();
        this.vStars = new Map();
    }
    
    get rank() { return this.system.rank; }
    get energy() { return this.system.energy; }
    get ship() { return this.system.ship; }
    get currentStage() { return this.system.currentStage; }
    set currentStage(v) { this.system.currentStage = v; }
    get selectedShipClass() { return this.system.selectedShipClass; }
    set selectedShipClass(v) { this.system.selectedShipClass = v; }

    async loadAssets() {
        await this.factory.loadAssets();
        this.factory.buildArenaGrid(this.system.ARENA_W, this.system.ARENA_H);
    }
    
    start(config) {
        this.system.start(config);
        
        this.shipVisual = this.factory.createShipVisual();
        
        if (this.camera) this.camera.position.set(0, 15, this.system.globalZ - 40);
        if (this.core && this.core.controls) this.core.controls.target.set(0, 0, this.system.globalZ + 20);
    }
    
    tick(dt) {
        this.system.tick(dt);
        
        if (this.core && this.core.controls && this.camera) {
            let targetZ = this.system.globalZ + 20;
            let dZ = this.system.scrollSpeed * dt;
            this.camera.position.z += dZ;
            this.core.controls.target.set(0, 0, targetZ);
        }
        
        this.factory.syncGrid(this.system.globalZ);
        this.factory.syncParticles(dt);
        
        // Handle events
        for(let ev of this.system.events) {
            if (ev.type === 'PARTICLES') {
                this.factory.spawnParticles(ev.pos, ev.color, ev.count, ev.speed);
            } else if (ev.type === 'GAUGE_UPDATE') {
                if (this.ui.onGaugeUpdate) this.ui.onGaugeUpdate(ev.index);
            } else if (ev.type === 'FLASH') {
                if (this.ui.onFlashScreen) this.ui.onFlashScreen(ev.flashType);
            } else if (ev.type === 'WAVE_UPDATE') {
                if (this.ui.onWaveUpdate) this.ui.onWaveUpdate(ev.wave);
                if (this.scene.fog && this.scene.fog.color) this.scene.fog.color.lerp(new THREE.Color(ev.wave.fog), dt);
            }
        }
        
        if (this.shipVisual && this.system.ship) {
            if (this.system.ship.dead) {
                this.shipVisual.visible = false;
                if (!this._deadFired) {
                    this._deadFired = true;
                    if (this.telemetryEnabled) this.submitTelemetry();
                }
            } else {
                this._deadFired = false;
                this.shipVisual.visible = true;
                this.shipVisual.position.set(this.system.ship.x, this.system.ship.y, this.system.ship.z);
                this.shipVisual.rotation.z = this.system.ship.rotZ;
                this.shipVisual.rotation.x = this.system.ship.rotX;
                
                // Hacky shield updates to match original
                if (this.shipVisual.userData.shieldMesh) {
                    let sm = this.shipVisual.userData.shieldMesh;
                    if(this.system.ship.invuln > 0) {
                        sm.material.opacity = 0.5 + Math.sin(Date.now()*0.02)*0.3;
                    } else if (this.system.ship.shields > 0) {
                        sm.material.opacity = 0.3;
                    } else {
                        sm.material.opacity = 0;
                    }
                }
            }
        }
        
        // Sync Stars
        let actStars = new Set();
        for(let s of this.system.decorStars) {
            actStars.add(s.id);
            if (!this.vStars.has(s.id)) {
                let m = new THREE.Mesh(new THREE.SphereGeometry(s.size, 4,4), new THREE.MeshBasicMaterial({color:0xaaccff, transparent:true, opacity:s.opacity}));
                this.scene.add(m);
                this.vStars.set(s.id, m);
            }
            let mesh = this.vStars.get(s.id);
            mesh.position.set(s.x, s.y, s.z);
        }
        for(let id of this.vStars.keys()) {
            if(!actStars.has(id)) {
                this.scene.remove(this.vStars.get(id));
                this.vStars.delete(id);
            }
        }
        
        // Sync Asteroids
        let actAst = new Set();
        for(let a of this.system.asteroids) {
            actAst.add(a.id);
            if (!this.vAsteroids.has(a.id)) {
                let mesh = a.isMono ? this.factory.createMonoWallVisual(this.system.ARENA_H) : this.factory.createAsteroidVisual(a.type, a.tier);
                if (mesh) this.vAsteroids.set(a.id, mesh);
            }
            let mesh = this.vAsteroids.get(a.id);
            if (mesh) {
                mesh.position.set(a.x, a.y, a.z);
                mesh.rotation.x = a.rotX; mesh.rotation.y = a.rotY; mesh.rotation.z = a.rotZ;
                if (a.isMono && mesh.userData.glow) {
                    mesh.userData.glow.material.opacity = 0.5 + Math.sin(this.system.stats.time*5)*0.3;
                }
            }
        }
        for(let id of this.vAsteroids.keys()) {
            if(!actAst.has(id)) {
                this.scene.remove(this.vAsteroids.get(id));
                this.vAsteroids.delete(id);
            }
        }
        
        // Sync Enemies
        let actEne = new Set();
        for(let e of this.system.enemies) {
            actEne.add(e.id);
            if (!this.vEnemies.has(e.id)) {
                let mesh = this.factory.createDroneVisual(e);
                if(mesh) this.vEnemies.set(e.id, mesh);
            }
            let mesh = this.vEnemies.get(e.id);
            if(mesh) {
                mesh.position.set(e.x, e.y, e.z);
                if(this.system.ship && !this.system.ship.dead) mesh.lookAt(this.system.ship.x, this.system.ship.y, this.system.ship.z);
            }
        }
        for(let id of this.vEnemies.keys()) {
            if(!actEne.has(id)) {
                this.scene.remove(this.vEnemies.get(id));
                this.vEnemies.delete(id);
            }
        }
        
        // Sync Items
        let actItm = new Set();
        for(let it of this.system.items) {
            actItm.add(it.id);
            if (!this.vItems.has(it.id)) {
                let mesh = this.factory.createItemVisual(it.iType);
                if(mesh) this.vItems.set(it.id, mesh);
            }
            let mesh = this.vItems.get(it.id);
            if(mesh) {
                mesh.position.set(it.x, it.y, it.z);
                mesh.rotation.x = it.rotX; mesh.rotation.y = it.rotY;
                if (it.iType === 'BELL') {
                    // Sync color
                    const BELL_COLORS = [0xffff33, 0x3388ff, 0xffffff, 0x33ff33, 0xff3333];
                    mesh.material.color.setHex(BELL_COLORS[it.bColor]);
                    mesh.material.emissive.setHex(BELL_COLORS[it.bColor]);
                }
            }
        }
        for(let id of this.vItems.keys()) {
            if(!actItm.has(id)) {
                this.scene.remove(this.vItems.get(id));
                this.vItems.delete(id);
            }
        }
        
        // Sync Projectiles
        let actProj = new Set();
        for(let p of this.system.projectiles) {
            actProj.add(p.id);
            if (!this.vProjectiles.has(p.id)) {
                let mesh = this.factory.createProjectileVisual(p.type, p.color);
                if(mesh) this.vProjectiles.set(p.id, mesh);
            }
            let mesh = this.vProjectiles.get(p.id);
            if(mesh) mesh.position.set(p.x, p.y, p.z);
        }
        for(let id of this.vProjectiles.keys()) {
            if(!actProj.has(id)) {
                this.scene.remove(this.vProjectiles.get(id));
                this.vProjectiles.delete(id);
            }
        }
    }

    setTelemetryEnabled(enabled = true) {
        this.telemetryEnabled = enabled === true;
        return this;
    }

    submitTelemetry(options = {}) {
        if (!this.telemetryEnabled && options.force !== true) {
            return { status: 'skipped', reason: 'telemetry-disabled' };
        }

        return this.telemetryClient.submitTelemetry(
            'asteroids',
            this.system.stats.score,
            { stage: this.system.currentStage, time: this.system.stats.time, graze: this.system.stats.graze }
        );
    }
}
