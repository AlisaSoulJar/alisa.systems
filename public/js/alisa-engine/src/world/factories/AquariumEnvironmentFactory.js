import * as THREE from 'three';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';
import { ParticleEmitter } from '../core/ParticleEmitter.js';

/**
 * AQUARIUM ENVIRONMENT FACTORY
 * ─────────────────────────────────────────────────────
 * Builds the full "Chopper Aquarium" scene:
 *   - Glass tank with physical material (transmission, ior)
 *   - Procedural skyscraper (N floors with window textures)
 *   - Underwater lighting (deep blue point light + wash lights)
 *   - Plankton dust (InstancedMesh particle system)
 *   - Chopper/Fish boid with GLB model, rotors, searchlight beam
 *   - Raccoon GLB hidden inside target floor
 *   - Coral GLB decorations
 *   - Minimap radar overlay (canvas 2D)
 *
 * This factory is VISUAL ONLY — game logic lives in:
 *   - ChopperAquariumEngine.js (flight AI, scan FSM, RL bridge)
 *   - EcosystemSystem.js (fish schooling, food chain, optional)
 *
 * OpenCore Pattern: Factory builds scene → Engine.on('event') → Factory reacts
 */

export class AquariumEnvironmentFactory {
    constructor(scene, camera, gltfLoader = null, basePath = '') {
        this.scene = scene;
        this.camera = camera;
        this.gltfLoader = gltfLoader;
        this.basePath = basePath;

        // Config
        this.TANK_SIZE = 120;
        this.TANK_HEIGHT = 100;
        this.FL_H = 4.0;
        this.FL_W = 20.0;
        this.FL_D = 20.0;
        this.totalFloors = 18;

        // Scene objects
        this.glassTank = null;
        this.buildingGroup = new THREE.Group();
        this.floors = [];
        this.chopperGroup = new THREE.Group();
        this.chopperInner = new THREE.Group();
        this.modelMesh = null;
        this.mainRotor = null;
        this.tailRotor = null;
        this.spotlight = null;
        this.volBeam = null;
        this.volBeam = null;
        this.dustEmitter = null;
        this.raccoonModel = null;
        this.raccoonMixer = null;
        this.coralMeshes = [];
        this.ecosystemMeshes = new Map();

        // Common Systems
        this.modelPool = new GLTFModelPool();
        this.texFactory = new ProceduralTextureFactory();

        // Textures
        this.texStrips = this.texFactory.getOrCreate('aquarium_windows', () => ProceduralTextureFactory.windowGrid());
    }

    // ────────────────────────────────────────────────
    //  PUBLIC BUILD METHODS
    // ────────────────────────────────────────────────

    buildAll(config = {}) {
        this.totalFloors = config.totalFloors || 18;
        this.TANK_HEIGHT = this.totalFloors * this.FL_H + 40;

        this._buildLighting();
        this._buildGround();
        this._buildTank();
        this._buildSkyscraper();
        this._buildChopper();
        this._buildPheromoneGrid();
        this._buildDust();
        if (config.corals !== false) this._buildCorals();

        // Position camera
        this.camera.position.set(100, this.totalFloors * this.FL_H, 100);

        return this;
    }

    // ────────────────────────────────────────────────
    //  TANK
    // ────────────────────────────────────────────────

    _buildTank() {
        const tankGeo = new THREE.BoxGeometry(this.TANK_SIZE, this.TANK_HEIGHT, this.TANK_SIZE);
        const tankMat = new THREE.MeshPhysicalMaterial({
            color: 0x1e88e5,
            transparent: true,
            opacity: 0.08,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.9,
            ior: 1.2,
            side: THREE.BackSide,
            depthWrite: false
        });
        this.glassTank = new THREE.Mesh(tankGeo, tankMat);
        this.glassTank.position.y = this.TANK_HEIGHT / 2;
        this.scene.add(this.glassTank);

        // Wireframe edges
        const edges = new THREE.EdgesGeometry(tankGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
            color: 0x1e88e5, opacity: 0.3, transparent: true
        }));
        line.position.y = this.TANK_HEIGHT / 2;
        this.scene.add(line);
    }

    // ────────────────────────────────────────────────
    //  LIGHTING
    // ────────────────────────────────────────────────

    _buildLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x445577, 1.6);
        this.scene.add(ambient);

        // Deep blue from below
        const deepLight = new THREE.PointLight(0x0044aa, 1.2, 200);
        deepLight.position.set(0, 10, 0);
        this.scene.add(deepLight);

        // Sun/overhead
        const sunLight = new THREE.DirectionalLight(0xaaddff, 2.0);
        sunLight.position.set(50, 150, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);
    }

    // ────────────────────────────────────────────────
    //  GROUND
    // ────────────────────────────────────────────────

    _buildGround() {
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    // ────────────────────────────────────────────────
    //  SKYSCRAPER
    // ────────────────────────────────────────────────

    _buildSkyscraper() {
        if (this.buildingGroup) this.scene.remove(this.buildingGroup);
        this.buildingGroup = new THREE.Group();
        this.floors = [];

        const geo = new THREE.BoxGeometry(this.FL_W, this.FL_H, this.FL_D);

        const matBody = new THREE.MeshStandardMaterial({
            color: 0x888888, emissive: 0x0a1a3a, emissiveIntensity: 0.6,
            map: this.texStrips, roughness: 0.8
        });
        const matRoof = new THREE.MeshStandardMaterial({
            color: 0x222225, emissive: 0x050a15, roughness: 0.9
        });

        // Wash lights
        const wash1 = new THREE.PointLight(0x00e6ff, 1.2, 100);
        wash1.position.set(25, this.totalFloors * this.FL_H * 0.3, 25);
        this.buildingGroup.add(wash1);

        const wash2 = new THREE.PointLight(0xff00aa, 0.8, 100);
        wash2.position.set(-25, this.totalFloors * this.FL_H * 0.7, -25);
        this.buildingGroup.add(wash2);

        for (let i = 0; i < this.totalFloors; i++) {
            const isTop = i === this.totalFloors - 1;
            const m = isTop
                ? [matBody, matBody, matRoof, matRoof, matBody, matBody]
                : [matBody, matBody, matBody, matBody, matBody, matBody];

            // Floor group for sliding/glow
            const floorGroup = new THREE.Group();
            floorGroup.position.set(0, (i * this.FL_H) + (this.FL_H / 2), 0);

            const mesh = new THREE.Mesh(geo, m);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { isFloor: true, floorIndex: i };
            floorGroup.add(mesh);

            // Glow box (additive blending, initially hidden)
            const glowGeo = new THREE.BoxGeometry(this.FL_W + 0.1, this.FL_H + 0.1, this.FL_D + 0.1);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff, transparent: true, opacity: 0.8,
                blending: THREE.AdditiveBlending, depthWrite: false, visible: false
            });
            const glowBox = new THREE.Mesh(glowGeo, glowMat);
            floorGroup.add(glowBox);

            // Hit mesh for raycasting
            const hitGeo = new THREE.BoxGeometry(this.FL_W + 0.5, this.FL_H, this.FL_D + 0.5);
            const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
            hitMesh.userData = { isFloor: true, floorIndex: i };
            hitMesh.position.set(0, (i * this.FL_H) + (this.FL_H / 2), 0);

            this.buildingGroup.add(floorGroup);
            this.buildingGroup.add(hitMesh);

            this.floors.push({ visual: mesh, hit: hitMesh, group: floorGroup, glow: glowBox });
        }

        // Roof ring
        const ringGeo = new THREE.TorusGeometry(this.FL_W * 0.4, 0.2, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x1e88e5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, (this.totalFloors * this.FL_H) + 0.2, 0);
        ring.rotation.x = -Math.PI / 2;
        this.buildingGroup.add(ring);

        this.scene.add(this.buildingGroup);
    }

    // ────────────────────────────────────────────────
    //  CHOPPER (Fish-Boid)
    // ────────────────────────────────────────────────

    _buildChopper() {
        this.chopperGroup.add(this.chopperInner);
        this.scene.add(this.chopperGroup);

        // Searchlight
        this.spotlight = new THREE.SpotLight(0x00ffff, 8.0, 500, Math.PI / 16, 0.1, 1.0);
        this.spotlight.position.set(0, -0.1, 1.2);
        this.spotlight.castShadow = true;
        this.spotlight.shadow.mapSize.set(512, 512);

        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, -0.1, 100);
        this.chopperInner.add(spotTarget);
        this.spotlight.target = spotTarget;
        this.chopperInner.add(this.spotlight);

        // Volumetric beam cone
        const beamCanvas = document.createElement('canvas');
        beamCanvas.width = 16; beamCanvas.height = 256;
        const bCtx = beamCanvas.getContext('2d');
        const g = bCtx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, 'rgba(0, 255, 255, 0.9)');
        g.addColorStop(1, 'rgba(0, 255, 255, 0)');
        bCtx.fillStyle = g;
        bCtx.fillRect(0, 0, 16, 256);

        const volGeo = new THREE.ConeGeometry(2.0, 150, 16, 1, true);
        volGeo.translate(0, -75, 0);
        volGeo.rotateX(Math.PI / 2);
        this.volBeam = new THREE.Mesh(volGeo, new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(beamCanvas),
            blending: THREE.AdditiveBlending,
            transparent: true, depthWrite: false, side: THREE.DoubleSide
        }));
        this.volBeam.position.set(0, -0.1, 1.2);
        this.chopperInner.add(this.volBeam);

        // Load GLB model (Normalized to 2.5 length, castShadow auto-applied)
        this.modelPool.load('chopper', this.basePath + 'props/models/Helicopter.glb', 2.5).then((wrapper) => {
            this.modelMesh = wrapper;
            this.modelMesh.rotation.y = Math.PI;

            this.modelMesh.traverse((node) => {
                if (node.isMesh) {
                    const n = node.name.toLowerCase();
                    if (n.includes('rotor') || n.includes('blade') || n.includes('prop')) {
                        if (n.includes('tail') || n.includes('back')) this.tailRotor = node;
                        else this.mainRotor = node;
                    }
                }
            });
            this.chopperInner.add(this.modelMesh);
        }).catch(() => {
            // Fallback: simple box
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1.5, 3.5),
                new THREE.MeshStandardMaterial({ color: 0x1e88e5 })
            );
            this.chopperInner.add(body);
        });
    }

    // ────────────────────────────────────────────────
    //  RACCOON (Hidden Target)
    // ────────────────────────────────────────────────

    placeRaccoon(floorIdx) {
        if (floorIdx < 0 || floorIdx >= this.floors.length) return;

        this.modelPool.load('raccoon', this.basePath + 'props/models/Raccoon.glb', 1.5).then((wrapper) => {
            this.raccoonModel = wrapper;
            this.raccoonModel.position.set(0, -this.FL_H / 2, 0);
            this.raccoonModel.visible = false;

            if (wrapper.animations && wrapper.animations.length > 0) {
                // The actual model with bones is inside the wrapper
                this.raccoonMixer = new THREE.AnimationMixer(wrapper.children[0]);
                this.raccoonMixer.clipAction(wrapper.animations[0]).play();
            }

            this.floors[floorIdx].group.add(this.raccoonModel);
        });
    }

    // ────────────────────────────────────────────────
    //  PLANKTON DUST
    // ────────────────────────────────────────────────

    _buildDust(count = 800) {
        this.dustEmitter = new ParticleEmitter(count, {
            mode: 'ambient',
            size: 0.5,
            bounds: new THREE.Vector3(this.TANK_SIZE, this.TANK_HEIGHT, this.TANK_SIZE)
        });
        this.dustEmitter.fillAmbient(count, 0x44bbff, { x: 0.5, y: 0.6, z: 0.5 });
        this.scene.add(this.dustEmitter.mesh);
    }

    // ────────────────────────────────────────────────
    //  PHEROMONE GRID (Stigmergy Voxel Renderer)
    // ────────────────────────────────────────────────

    _buildPheromoneGrid() {
        const maxVoxels = 8000;
        this.dummyObj = new THREE.Object3D();
        const geo = new THREE.BoxGeometry(6.0, 6.0, 6.0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x33ff33, transparent: true, opacity: 0.15,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.pheromoneMesh = new THREE.InstancedMesh(geo, mat, maxVoxels);
        this.pheromoneMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Pre-allocate color array to distinguish food (green) and danger (red)
        const colorArr = new Float32Array(maxVoxels * 3);
        this.pheromoneMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);
        
        this.scene.add(this.pheromoneMesh);
    }

    // ────────────────────────────────────────────────
    //  CORALS (GLB decoration)
    // ────────────────────────────────────────────────

    _buildCorals() {
        this.modelPool.load('coral', this.basePath + 'props/models/underwater_enviro_coral.glb', 12.0).then((wrapper) => {
            const positions = [
                { x: -30, z: -30 }, { x: 30, z: -30 },
                { x: -30, z: 30 }, { x: 30, z: 30 }
            ];
            for (const p of positions) {
                const c = wrapper.clone();
                c.position.set(p.x, 0, p.z);
                c.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(c);
                this.coralMeshes.push(c);
            }
        });
    }

    // ────────────────────────────────────────────────
    //  PER-FRAME UPDATE (Visual sync from engine state)
    // ────────────────────────────────────────────────

    /**
     * Sync visual scene to engine state. Call each frame.
     * @param {Object} engineState - { chopper: {x,y,z,rotY}, chopperVelocity, gameState, chopperState }
     * @param {number} dt - delta time
     */
    syncToEngine(engineState, dt) {
        const ch = engineState.chopper;

        // Chopper position
        this.chopperGroup.position.set(ch.x, ch.y, ch.z);

        // Facing direction from velocity or engine-provided rotation
        if (engineState.chopperVelocity) {
            const vel = engineState.chopperVelocity;
            const velLen = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            if (velLen > 0.5) {
                const targetY = Math.atan2(vel.x, vel.z);
                let diff = targetY - this.chopperGroup.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.chopperGroup.rotation.y += diff * 6 * dt;
            }
        }

        // Rotors
        if (this.mainRotor) this.mainRotor.rotation.y += 20 * dt;
        if (this.tailRotor) this.tailRotor.rotation.x += 20 * dt;

        // Visual tilt from velocity
        if (engineState.chopperVelocity) {
            const vel = engineState.chopperVelocity;
            const targetPitch = Math.max(-0.6, Math.min(0.6, (vel.z * 0.025)));
            const targetRoll = Math.max(-0.7, Math.min(0.7, (vel.x * -0.04)));
            this.chopperInner.rotation.x += (targetPitch - this.chopperInner.rotation.x) * 6.0 * dt;
            this.chopperInner.rotation.z += (targetRoll - this.chopperInner.rotation.z) * 6.0 * dt;
        }

        // Dust animation
        if (this.dustEmitter) {
            this.dustEmitter.tick(dt);
        }

        // Raccoon animation mixer
        if (this.raccoonMixer) this.raccoonMixer.update(dt);

        // Low battery beam flicker
        if (this.volBeam && this.spotlight && engineState.gameState) {
            const fuel = engineState.gameState.fuel;
            if (fuel < 20) {
                const flicker = Math.random() > 0.95 ? 0.2 : 1.0;
                const fade = Math.max(0.1, fuel / 20.0);
                this.spotlight.intensity = 8.0 * fade * flicker;
                this.volBeam.material.opacity = fade * flicker;
            } else {
                this.spotlight.intensity = 8.0;
                this.volBeam.material.opacity = 1.0;
            }
        }

        // Ecosystem sync
        if (engineState.fishes && engineState.hunters && engineState.sharks) {
            this._syncEcosystemGroup(engineState.fishes, 'fish', 'Fish1.glb', 2.0, dt);
            this._syncEcosystemGroup(engineState.hunters, 'hunter', 'Lionfish.glb', 3.0, dt);
            this._syncEcosystemGroup(engineState.sharks, 'shark', 'Shark.glb', 6.0, dt);
        }

        // Pheromone Voxel Sync
        if (this.pheromoneMesh && engineState.meta && engineState.meta.pheromones) {
            let ph = engineState.meta.pheromones;
            let count = Math.min(ph.length, this.pheromoneMesh.geometry.maxInstancedCount || 8000);
            
            let color3 = new THREE.Color();
            for (let i = 0; i < count; i++) {
                let p = ph[i];
                this.dummyObj.position.set(p.x, p.y, p.z);
                
                // Scale relative to intensity
                let intensity = Math.min(1.0, (p.food + p.danger) / 20.0);
                let s = Math.max(0.1, intensity);
                this.dummyObj.scale.set(s, s, s);
                this.dummyObj.updateMatrix();
                this.pheromoneMesh.setMatrixAt(i, this.dummyObj.matrix);
                
                // Color: Danger overrides Food if present
                if (p.danger > 0) color3.setHex(0xff1111); // Red danger
                else color3.setHex(0x11ff33); // Green food
                this.pheromoneMesh.setColorAt(i, color3);
            }
            this.pheromoneMesh.count = count;
            this.pheromoneMesh.instanceMatrix.needsUpdate = true;
            if (this.pheromoneMesh.instanceColor) this.pheromoneMesh.instanceColor.needsUpdate = true;
        }
    }

    _syncEcosystemGroup(agents, type, modelName, scale, dt) {
        for (const agent of agents) {
            let meshObj = this.ecosystemMeshes.get(agent.id);
            
            if (!agent.alive) {
                if (meshObj) meshObj.mesh.visible = false;
                continue;
            }
            
            if (!meshObj) {
                const group = new THREE.Group();
                this.scene.add(group);
                meshObj = { mesh: group };
                this.ecosystemMeshes.set(agent.id, meshObj);
                
                // Fallback geometry while loading
                const geo = new THREE.ConeGeometry(0.5 * scale, 1.5 * scale, 4);
                geo.rotateX(Math.PI/2);
                const mat = new THREE.MeshStandardMaterial({ color: type==='fish'?0x33aa33:type==='hunter'?0xff8800:0x888888 });
                const fallback = new THREE.Mesh(geo, mat);
                group.add(fallback);
                
                this.modelPool.load(modelName, this.basePath + 'props/models/' + modelName, scale).then(wrapper => {
                    group.remove(fallback);
                    const clone = wrapper.clone();
                    if (type === 'shark' || type === 'fish' || type === 'hunter') {
                        // Adjust default facing depending on the model's coordinate system
                        clone.rotation.y = Math.PI; 
                    }
                    group.add(clone);
                }).catch(e => {});
            }
            
            meshObj.mesh.visible = !agent.isHidden;
            meshObj.mesh.position.set(agent.x, agent.y, agent.z);
            
            // Calculate rotation from velocity
            if (agent.vx !== undefined && agent.vz !== undefined) {
                const velLenSq = agent.vx*agent.vx + agent.vz*agent.vz;
                if (velLenSq > 0.01) {
                    const targetY = Math.atan2(agent.vx, agent.vz);
                    let diff = targetY - meshObj.mesh.rotation.y;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    meshObj.mesh.rotation.y += diff * 5 * dt;
                }
            }
        }
    }

    // ────────────────────────────────────────────────
    //  EVENT HANDLERS (Wired to ChopperAquariumEngine)
    // ────────────────────────────────────────────────

    /** Called when a floor is scanned */
    onFloorChecked({ floorIdx, success }) {
        const floor = this.floors[floorIdx];
        if (!floor) return;

        floor.visual.visible = false; // Hide concrete

        if (success) {
            // Reveal raccoon + green glow
            if (this.raccoonModel) this.raccoonModel.visible = true;
            floor.glow.material.color.setHex(0x34c759);
            floor.glow.material.visible = true;
            floor.glow.visible = true;
        } else {
            // Red glow
            floor.glow.material.color.setHex(0xff3300);
            floor.glow.material.opacity = 0.5;
            floor.glow.material.visible = true;
            floor.glow.visible = true;
        }
    }

    /** Called when chopper starts inspecting a floor */
    onStartInspecting(floorIdx) {
        const floor = this.floors[floorIdx];
        if (!floor) return;
        floor.glow.material.color.setHex(0x00ffff);
        floor.glow.material.opacity = 0.8;
        floor.glow.material.visible = true;
        floor.glow.visible = true;
    }

    /** Reset all floor visuals for a new episode */
    resetFloorVisuals() {
        for (const f of this.floors) {
            f.visual.visible = true;
            f.glow.visible = false;
            f.glow.material.visible = false;
        }
        if (this.raccoonModel) this.raccoonModel.visible = false;
    }

    // ────────────────────────────────────────────────
    //  HELPERS
    // ────────────────────────────────────────────────



    /** Get hit-test floors for raycasting */
    getFloorHitMeshes() {
        return this.floors.map(f => f.hit);
    }

    /** Dispose all meshes (cleanup) */
    dispose() {
        this.scene.remove(this.buildingGroup);
        this.scene.remove(this.chopperGroup);
        if (this.glassTank) this.scene.remove(this.glassTank);
        if (this.dustEmitter) this.dustEmitter.dispose();
        for (const c of this.coralMeshes) this.scene.remove(c);
        if (this.ecosystemMeshes) {
            for (const [id, obj] of this.ecosystemMeshes) {
                this.scene.remove(obj.mesh);
            }
            this.ecosystemMeshes.clear();
        }
    }
}
