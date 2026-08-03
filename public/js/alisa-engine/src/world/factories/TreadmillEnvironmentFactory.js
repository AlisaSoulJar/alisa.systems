import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class TreadmillEnvironmentFactory extends BaseEnvironmentFactory {
    
    constructor(scene = null, camera = null) {
        super(scene, null);
        this.camera = camera;

        this.entities = [];
        this._pendingAdds = [];
        
        // Proxy for legacy constructors trying to do this.scene.add() before init
        if (!scene) {
            this.scene = { 
                add: (obj) => { this._pendingAdds.push(obj); },
                remove: (obj) => { }
            };
        }
        
        this._legacyConstructor();
    }

    _legacyConstructor() {

        this.subjectGroup = null;      // Settings
        this.TILE_SIZE = 10;
        this.AQUARIUM_RADIUS = 8;
        
        // Materials
        this.matWireframe = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.5 });
        this.matCube = new THREE.MeshBasicMaterial({ color: 0x112233 });
        this.matDetailedBase = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.8 });
        this.matNeon = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        
        // Active Chunks: Map Key: "GlobalX,GlobalZ" -> { mesh, lod }
        this.activeChunks = new Map();
        
        this.setupArena();
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Terreno INFINITO por chunks: buildAll solo siembra los chunks iniciales
     * alrededor del origen; el resto los pide tickAquarium() según avanzas.
     * @param {number} [c.radius=1] anillo de chunks a pre-generar (1 → 3x3)
     */
    buildAll(c = {}) {
        this.setupArena();
        const r = c.radius ?? 1;
        for (let gx = -r; gx <= r; gx++)
            for (let gz = -r; gz <= r; gz++)
                this.buildChunk(gx, gz, c.lodLevel ?? 0);
        return { chunks: this.chunks ?? null };
    }

    setupArena() {
        this.applyLightingPreset({
            ambient: { color: 0x404040, intensity: 2.0 }
        });
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        this.scene.add(dirLight);

        this.gridHelper = new THREE.GridHelper(400, 40, 0x00ffaa, 0x112233);
        this.scene.add(this.gridHelper);
    }
    
    // Pseudo-random hash based on global grid coordinates
    hashCoord(gx, gz) {
        let s = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453;
        return s - Math.floor(s);
    }

    buildChunk(gx, gz, lodLevel) {
        const h = this.hashCoord(gx, gz);
        const height = 5 + h * 25; // Random building height
        const w = this.TILE_SIZE * 0.8; 
        
        const group = new THREE.Group();
        
        if (lodLevel === "WIREFRAME") {
            const geo = new THREE.BoxGeometry(w, height, w);
            const edges = new THREE.EdgesGeometry(geo);
            const wire = new THREE.LineSegments(edges, this.matWireframe);
            wire.position.y = height / 2;
            group.add(wire);
        } else if (lodLevel === "CUBE") {
            const geo = new THREE.BoxGeometry(w, height, w);
            const mesh = new THREE.Mesh(geo, this.matCube);
            mesh.position.y = height / 2;
            group.add(mesh);
        } else if (lodLevel === "DETAILED") {
            const geo = new THREE.BoxGeometry(w, height, w);
            const mesh = new THREE.Mesh(geo, this.matDetailedBase);
            mesh.position.y = height / 2;
            
            const stripGeo = new THREE.BoxGeometry(w + 0.1, 1, w + 0.1);
            const strip = new THREE.Mesh(stripGeo, this.matNeon);
            strip.position.y = height * (0.3 + (h % 0.4));
            
            group.add(mesh);
            group.add(strip);
        }
        return group;
    }

    /**
     * Ticks the procedural generation based on the world Z displacement.
     * @param {number} worldZOffset Current treadmill scroll position.
     * @param {number} currentKatScale Camera/Domain scalar multiplier.
     * @returns {Object} { totalRendered, detail, cube, wire } for telemetry.
     */
    tickAquarium(worldZOffset, currentKatScale) {
        // Sync the floor grid visually to the sub-tile offset
        this.gridHelper.position.z = worldZOffset % this.TILE_SIZE;

        const centerGlobalZ = Math.floor(-worldZOffset / this.TILE_SIZE);
        const centerGlobalX = 0; 
        
        let requestedKeys = new Set();
        let totalRendered = 0;
        let counts = { detail: 0, cube: 0, wire: 0 };

        let visualRadius = Math.ceil(this.AQUARIUM_RADIUS * currentKatScale);

        for (let dx = -visualRadius; dx <= visualRadius; dx++) {
            for (let dz = -visualRadius; dz <= visualRadius; dz++) {
                // Keep the center highway clear
                if (Math.abs(dx) < 2) continue;

                let gx = centerGlobalX + dx;
                let gz = centerGlobalZ + dz;
                let key = `${gx},${gz}`;
                requestedKeys.add(key);

                let px = gx * this.TILE_SIZE;
                let pz = (gz * this.TILE_SIZE) + worldZOffset; 
                let dist = Math.hypot(px, pz);
                
                let lod = "WIREFRAME";
                if (dist < 25 * currentKatScale) { lod = "DETAILED"; }
                else if (dist < 55 * currentKatScale) { lod = "CUBE"; }

                let existing = this.activeChunks.get(key);
                if (existing && existing.lod !== lod) {
                    this.scene.remove(existing.mesh);
                    this.activeChunks.delete(key);
                    existing = null;
                }

                if (!existing) {
                    let chunkGroup = this.buildChunk(gx, gz, lod);
                    chunkGroup.userData = { gx, gz, lod };
                    this.scene.add(chunkGroup);
                    this.activeChunks.set(key, { mesh: chunkGroup, lod });
                }

                let chunk = this.activeChunks.get(key);
                chunk.mesh.position.set(px, 0, pz);
                
                totalRendered++;
                if (lod === "DETAILED") counts.detail++;
                else if (lod === "CUBE") counts.cube++;
                else counts.wire++;
            }
        }

        // Purge memory
        for (let [key, chunk] of this.activeChunks.entries()) {
            if (!requestedKeys.has(key)) {
                this.scene.remove(chunk.mesh);
                this.activeChunks.delete(key);
            }
        }

        return { totalRendered, ...counts };
    }

    setCore(core) {
        this.core = core;
        if (!this.camera && core.camera) this.camera = core.camera;
    }

    init(scene) {
        this.scene = scene;
        // Apply any groups added during the proxy constructor phase
        if (this._pendingAdds) {
            this._pendingAdds.forEach(obj => this.scene.add(obj));
            this._pendingAdds = [];
        }
        if (this.setupArena) this.setupArena();
    }
    
    update(dt) {
        this.zScroll = (this.zScroll || 0) + dt * 25.0; // Simulate moving forward at 25 m/s
        this.tickAquarium(this.zScroll, 1.0);
    }

}
