import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';

/**
 * INTERACTION LAB ENVIRONMENT FACTORY
 * ─────────────────────────────────────────────────────
 * Builds the "Food Chain Arena":
 *   - Flat arena floor with grid overlay
 *   - Crates (GLB or procedural boxes) as hiding spots
 *   - Cheese collectibles (glowing golden cubes)
 *   - GLB entity spawners: Mouse, Fox, Raptor
 *   - Per-agent stamina bar sprites
 *   - Blood/smoke particle effects on events
 *   - Arena boundary walls (invisible + visual fence)
 *
 * Game logic lives in FoodChainSystem.js (745 LOC headless engine).
 * This factory only handles visual representation + event FX.
 *
 * OpenCore Pattern: Factory builds scene → FoodChainSystem produces state →
 *                   Factory.syncAgents(state) moves meshes each frame
 */

export class InteractionLabFactory extends BaseEnvironmentFactory {
    constructor(scene, camera, gltfLoader = null, basePath = '') {
        super(scene, null);
        this.camera = camera;
        this.basePath = basePath;

        // Config
        this.arenaSize = 18;
        this.crateCount = 8;
        this.cheeseCount = 5;

        // Entity mesh pools
        this.preyMeshes = new Map();    // id → { group, model, staminaBar }
        this.predMeshes = new Map();    // id → { group, model, staminaBar }
        this.crateMeshes = [];
        this.cheeseMeshes = new Map();  // id → mesh

        // Loaded GLB templates (cloned per entity)
        this._templates = { mouse: null, fox: null, raptor: null };

        // Pending entities waiting for GLB templates
        this._pendingSpawns = [];  // { agent, entry, templateKey }

        // Particle pools
        this._particles = [];
    }

    // ────────────────────────────────────────────────
    //  PUBLIC BUILD
    // ────────────────────────────────────────────────

    buildAll(config = {}) {
        this.arenaSize = config.arenaSize || 18;
        this.crateCount = config.crateCount || 8;
        this.cheeseCount = config.cheeseCount || 5;

        this._buildLighting();
        this._buildArenaFloor();
        this._buildCrates(config.cratePositions);
        this._buildCheese(config.cheesePositions);
        this._loadEntityTemplates();

        // Camera setup (top-down with slight angle)
        this.camera.position.set(0, 30, 22);
        this.camera.lookAt(0, 0, 0);

        return this;
    }

    // ────────────────────────────────────────────────
    //  LIGHTING
    // ────────────────────────────────────────────────

    _buildLighting() {
        const ambient = new THREE.AmbientLight(0x667788, 1.2);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(10, 25, 15);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -25;
        sun.shadow.camera.right = 25;
        sun.shadow.camera.top = 25;
        sun.shadow.camera.bottom = -25;
        this.scene.add(sun);

        // Warm accent from below
        const warm = new THREE.PointLight(0xffaa44, 0.4, 40);
        warm.position.set(0, 1, 0);
        this.scene.add(warm);
    }

    // ────────────────────────────────────────────────
    //  ARENA FLOOR
    // ────────────────────────────────────────────────

    _buildArenaFloor() {
        const S = this.arenaSize;

        // Main floor
        const floorGeo = new THREE.PlaneGeometry(S * 2, S * 2);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a, roughness: 0.85, metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid overlay
        const gridHelper = new THREE.GridHelper(S * 2, S * 2, 0x333355, 0x222244);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Boundary fence posts (visual only)
        const postMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
        const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
        const fencePositions = [];
        for (let i = -S; i <= S; i += 4) {
            fencePositions.push({ x: i, z: -S }, { x: i, z: S });
            fencePositions.push({ x: -S, z: i }, { x: S, z: i });
        }
        for (const p of fencePositions) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(p.x, 1, p.z);
            post.castShadow = true;
            this.scene.add(post);
        }
    }

    // ────────────────────────────────────────────────
    //  CRATES (Hiding spots)
    // ────────────────────────────────────────────────

    _buildCrates(positions) {
        const crateGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0x8B6914, roughness: 0.9, metalness: 0.0
        });

        const cratePositions = positions || this._generateCratePositions();

        for (const p of cratePositions) {
            let crateMesh;

            if (this.gltfLoader) {
                // Try loading Box.glb, but create procedural fallback immediately
                crateMesh = new THREE.Mesh(crateGeo, crateMat);
                crateMesh.position.set(p.x, 0.75, p.z);
                crateMesh.castShadow = true;
                crateMesh.receiveShadow = true;
                this.scene.add(crateMesh);

                // Async replace with GLB if available
                GLTFModelPool.get(this.basePath + 'props/models/Box.glb').then((gltf) => {
                    const boxModel = gltf.scene.clone();
                    boxModel.scale.set(1.2, 1.2, 1.2);
                    boxModel.position.copy(crateMesh.position);
                    boxModel.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
                    this.scene.remove(crateMesh);
                    this.scene.add(boxModel);
                    const idx = this.crateMeshes.indexOf(crateMesh);
                    if (idx >= 0) this.crateMeshes[idx] = boxModel;
                }).catch(() => { /* keep procedural */ });
            } else {
                crateMesh = new THREE.Mesh(crateGeo, crateMat);
                crateMesh.position.set(p.x, 0.75, p.z);
                crateMesh.castShadow = true;
                this.scene.add(crateMesh);
            }

            this.crateMeshes.push(crateMesh);
        }
    }

    _generateCratePositions() {
        const S = this.arenaSize - 2;
        const positions = [];
        for (let i = 0; i < this.crateCount; i++) {
            positions.push({
                x: (Math.random() - 0.5) * S * 2,
                z: (Math.random() - 0.5) * S * 2
            });
        }
        return positions;
    }

    // ────────────────────────────────────────────────
    //  CHEESE (Collectibles)
    // ────────────────────────────────────────────────

    _buildCheese(positions) {
        const cheeseGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const cheeseMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.6,
            roughness: 0.3, metalness: 0.5
        });

        const cheesePositions = positions || this._generateCheesePositions();

        for (let i = 0; i < cheesePositions.length; i++) {
            const p = cheesePositions[i];
            const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
            cheese.position.set(p.x, 0.3, p.z);
            cheese.rotation.y = Math.random() * Math.PI;

            // Glowing point light under cheese
            const light = new THREE.PointLight(0xffcc00, 0.3, 3);
            light.position.set(0, 0.1, 0);
            cheese.add(light);

            this.scene.add(cheese);
            this.cheeseMeshes.set(`cheese_${i}`, cheese);
        }
    }

    _generateCheesePositions() {
        const S = this.arenaSize - 3;
        const positions = [];
        for (let i = 0; i < this.cheeseCount; i++) {
            positions.push({
                x: (Math.random() - 0.5) * S * 2,
                z: (Math.random() - 0.5) * S * 2
            });
        }
        return positions;
    }

    // ────────────────────────────────────────────────
    //  ENTITY TEMPLATES (GLB loading)
    // ────────────────────────────────────────────────

    _loadEntityTemplates() {
        const models = {
            mouse: { file: 'Mouse.glb', scale: 0.8, fallbackColor: 0xcccccc },
            fox: { file: 'beast_fox.glb', scale: 0.8, fallbackColor: 0xff6600 },
            raptor: { file: 'Velociraptor.glb', scale: 1.2, fallbackColor: 0x338833 }
        };

        for (const [key, cfg] of Object.entries(models)) {
            GLTFModelPool.get(`${this.basePath}props/models/${cfg.file}`).then((gltf) => {
                const model = gltf.scene.clone();
                model.scale.set(cfg.scale, cfg.scale, cfg.scale);
                model.traverse(n => {
                    if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
                });
                this._templates[key] = { model, animations: gltf.animations || [] };
                this._attachPendingSpawns(key);
            }).catch(() => {
                // Fallback: colored capsule
                const geo = key === 'raptor'
                    ? new THREE.ConeGeometry(0.5, 1.5, 8)
                    : new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
                const mat = new THREE.MeshStandardMaterial({ color: cfg.fallbackColor });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                this._templates[key] = { model: mesh, animations: [] };
                this._attachPendingSpawns(key);
            });
        }
    }

    // ────────────────────────────────────────────────
    //  SPAWN / DESPAWN ENTITIES
    // ────────────────────────────────────────────────

    /**
     * Spawn a visual entity for a FoodChainSystem agent.
     * @param {Object} agent - { id, role, tier, position }
     */
    spawnEntity(agent) {
        const group = new THREE.Group();
        group.position.set(agent.position.x, 0, agent.position.z);

        let templateKey;
        if (agent.role === 'prey') templateKey = 'mouse';
        else if (agent.tier === 'apex') templateKey = 'raptor';
        else templateKey = 'fox';

        // Clone model if template loaded, otherwise queue for deferred attachment
        const template = this._templates[templateKey];
        if (template && template.model) {
            const clone = template.model.clone();
            group.add(clone);
        } else {
            this._pendingSpawns.push({ templateKey, group });
        }

        // Stamina bar (billboard sprite above entity)
        const barCanvas = document.createElement('canvas');
        barCanvas.width = 64; barCanvas.height = 8;
        const barTex = new THREE.CanvasTexture(barCanvas);
        const barSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: barTex, transparent: true }));
        barSprite.scale.set(2, 0.3, 1);
        barSprite.position.y = 2.2;
        group.add(barSprite);

        this.scene.add(group);

        const entry = { group, staminaBar: { canvas: barCanvas, texture: barTex, sprite: barSprite } };
        if (agent.role === 'prey') this.preyMeshes.set(agent.id, entry);
        else this.predMeshes.set(agent.id, entry);
    }

    despawnEntity(agentId) {
        for (const map of [this.preyMeshes, this.predMeshes]) {
            const entry = map.get(agentId);
            if (entry) {
                this.scene.remove(entry.group);
                map.delete(agentId);
                return;
            }
        }
    }

    /** Attach GLB models to entities that spawned before their template was loaded */
    _attachPendingSpawns(templateKey) {
        const template = this._templates[templateKey];
        if (!template || !template.model) return;

        for (let i = this._pendingSpawns.length - 1; i >= 0; i--) {
            const pending = this._pendingSpawns[i];
            if (pending.templateKey === templateKey) {
                const clone = template.model.clone();
                pending.group.add(clone);
                this._pendingSpawns.splice(i, 1);
            }
        }
    }

    // ────────────────────────────────────────────────
    //  PER-FRAME SYNC
    // ────────────────────────────────────────────────

    /**
     * Sync all entity visuals to engine state.
     * @param {Object[]} allAgents - Array of prey + predator states from FoodChainSystem
     * @param {number} dt
     * @param {number} t - total elapsed time
     */
    syncAgents(allAgents, dt, t) {
        for (const agent of allAgents) {
            const map = agent.role === 'prey' ? this.preyMeshes : this.predMeshes;
            const entry = map.get(agent.id);
            if (!entry) continue;

            const g = entry.group;

            if (!agent.alive) {
                g.visible = false;
                continue;
            }
            g.visible = !agent.isHidden;

            // Position
            g.position.x = agent.position.x;
            g.position.z = agent.position.z;

            // Hop animation for prey
            if (agent.role === 'prey' && agent.hopPhase !== undefined) {
                g.position.y = Math.abs(Math.sin(agent.hopPhase)) * (agent.hopAmp || 0.02);
            }

            // Jump arc for predators
            if (agent.jumpY !== undefined && agent.jumpY > 0) {
                g.position.y = agent.jumpY;
            }

            // Rotation
            if (agent.rotation !== undefined) {
                g.rotation.y = agent.rotation;
            }

            // Stamina bar
            this._updateStaminaBar(entry.staminaBar, agent.stamina, agent.maxStamina || 100, agent.exhausted);

            // Process events
            if (agent.events) {
                for (const evt of agent.events) {
                    if (evt === 'kill' || evt === 'boo_hit') {
                        this._spawnParticle(agent.position, evt === 'kill' ? 0xff0000 : 0xffaa00);
                    }
                    if (evt.startsWith('cheese_id:')) {
                        const cheeseId = evt.split(':')[1];
                        this.removeCheese(cheeseId);
                    }
                }
            }
        }

        // Animate particles
        this._updateParticles(dt);

        // Cheese bob animation
        for (const [, mesh] of this.cheeseMeshes) {
            mesh.position.y = 0.3 + Math.sin(t * 3) * 0.08;
            mesh.rotation.y += dt * 1.5;
        }
    }

    // ────────────────────────────────────────────────
    //  CHEESE MANAGEMENT
    // ────────────────────────────────────────────────

    removeCheese(id) {
        const mesh = this.cheeseMeshes.get(id);
        if (mesh) {
            this.scene.remove(mesh);
            this.cheeseMeshes.delete(id);
        }
    }

    // ────────────────────────────────────────────────
    //  STAMINA BAR
    // ────────────────────────────────────────────────

    _updateStaminaBar(bar, stamina, maxStamina, exhausted) {
        const ctx = bar.canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 8);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 64, 8);

        // Fill
        const ratio = Math.max(0, stamina / maxStamina);
        const color = exhausted ? '#ff3333' : (ratio < 0.3 ? '#ff9900' : '#33cc33');
        ctx.fillStyle = color;
        ctx.fillRect(1, 1, 62 * ratio, 6);

        bar.texture.needsUpdate = true;
    }

    // ────────────────────────────────────────────────
    //  PARTICLES (Blood/Impact)
    // ────────────────────────────────────────────────

    _spawnParticle(pos, color) {
        const geo = new THREE.SphereGeometry(0.08, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });

        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(geo, mat.clone());
            p.position.set(pos.x, 0.5, pos.z);
            const vel = {
                x: (Math.random() - 0.5) * 6,
                y: Math.random() * 4 + 2,
                z: (Math.random() - 0.5) * 6
            };
            this.scene.add(p);
            this._particles.push({ mesh: p, vel, life: 1.0 });
        }
    }

    _updateParticles(dt) {
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.mesh.position.x += p.vel.x * dt;
            p.mesh.position.y += p.vel.y * dt;
            p.mesh.position.z += p.vel.z * dt;
            p.vel.y -= 9.8 * dt; // gravity
            p.life -= dt * 1.5;
            p.mesh.material.opacity = Math.max(0, p.life);

            if (p.life <= 0 || p.mesh.position.y < 0) {
                this.scene.remove(p.mesh);
                this._particles.splice(i, 1);
            }
        }
    }

    // ────────────────────────────────────────────────
    //  CLEANUP
    // ────────────────────────────────────────────────

    dispose() {
        for (const [, e] of this.preyMeshes) this.scene.remove(e.group);
        for (const [, e] of this.predMeshes) this.scene.remove(e.group);
        for (const c of this.crateMeshes) this.scene.remove(c);
        for (const [, m] of this.cheeseMeshes) this.scene.remove(m);
        for (const p of this._particles) this.scene.remove(p.mesh);
        this.preyMeshes.clear();
        this.predMeshes.clear();
        this.cheeseMeshes.clear();
        this.crateMeshes = [];
        this._particles = [];
    }
}
