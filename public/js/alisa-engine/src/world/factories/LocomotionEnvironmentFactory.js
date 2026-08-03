import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';

export class LocomotionEnvironmentFactory extends BaseEnvironmentFactory {
    
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
        this.cadObjects = [];
        this.platforms = []; // Array of { mesh, box, topY }
        this.crystals = [];  // Array of { mesh, active }
        this.floorTiles = []; // Array of dance-floor tiles (was missing → buildDanceFloor crashed on .push)
        this.score = 0;
        this.tileGroup = new THREE.Group();
        this.scene.add(this.tileGroup);
        
        // Input state
        this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false };
        this.agentInput = { x: 0, z: 0, jump: false };
        this._bindKeys();
        
        this.setupArena();
        this.buildJumpingPuzzle();
        this.setupPlayer();
    }
    
    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Orden: arena → jugador → suelo de baile → puzzle de saltos.
     * El jugador va después de la arena porque se apoya en su altura de suelo.
     */
    buildAll(c = {}) {
        this.setupArena();
        this.setupPlayer();
        if (c.danceFloor !== false) this.buildDanceFloor();
        if (c.jumpingPuzzle !== false) this.buildJumpingPuzzle();
        return { arena: this.arena ?? null, player: this.player ?? null };
    }

    applyAction(inputX, inputZ, jump = false) {
        this.agentInput.x = inputX;
        this.agentInput.z = inputZ;
        this.agentInput.jump = jump;
    }

    getState() {
        return {
            player: {
                x: this.player ? parseFloat(this.player.position.x.toFixed(2)) : 0,
                y: this.player ? parseFloat(this.player.position.y.toFixed(2)) : 0,
                z: this.player ? parseFloat(this.player.position.z.toFixed(2)) : 0,
                vx: parseFloat(this.playerVelocity.x.toFixed(2)),
                vy: parseFloat(this.playerVelocity.y.toFixed(2)),
                vz: parseFloat(this.playerVelocity.z.toFixed(2)),
                grounded: this.isGrounded
            },
            platforms: this.platforms.map(p => ({
                minX: parseFloat(p.box.min.x.toFixed(2)), maxX: parseFloat(p.box.max.x.toFixed(2)),
                minZ: parseFloat(p.box.min.z.toFixed(2)), maxZ: parseFloat(p.box.max.z.toFixed(2)),
                topY: parseFloat(p.topY.toFixed(2))
            })),
            crystals: this.crystals.filter(c => c.active).map(c => ({
                x: parseFloat(c.mesh.position.x.toFixed(2)),
                y: parseFloat(c.mesh.position.y.toFixed(2)),
                z: parseFloat(c.mesh.position.z.toFixed(2))
            })),
            score: this.score
        };
    }

    _bindKeys() {
        document.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true;
        });
        document.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
        });
    }

    setupPlayer() {
        this.player = new THREE.Group();
        this.player.position.set(0, 5, 0);
        this.scene.add(this.player);
        
        // GLTFModelPool is an INSTANTIABLE pool: load(key,path,size) caches+normalizes, get(key) returns a clone.
        // (was called as a static GLTFModelPool.get(url).then(...) — wrong API, crashed setupPlayer.)
        const modelPool = new GLTFModelPool();
        modelPool.load('cockroach', '../props/models/Cockroach.glb', 1.2)
            .then(() => {
                const model = modelPool.get('cockroach');
                if (model) {
                    model.position.y = -0.5; // sit the normalized model on the capsule center
                    model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.material.roughness = 0.8; c.material.metalness = 0.2; } });
                    this.player.add(model);
                }
            })
            .catch(err => console.warn('[Locomotion] Cockroach model load failed (scene still runs):', err));
        
        // Add a small light to the player
        const playerLight = new THREE.PointLight(0xff3366, 1.0, 5);
        this.player.add(playerLight);

        this.playerVelocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;
    }

    setupArena() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcadcfa, 0.8);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const grid = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
        grid.material.opacity = 0.08;
        grid.material.transparent = true;
        this.scene.add(grid);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.ShadowMaterial({ opacity: 0.15 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.buildDanceFloor();
    }

    buildDanceFloor() {
        const tileGeo = new THREE.PlaneGeometry(1.9, 1.9);
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
                const t = new THREE.Mesh(tileGeo, mat);
                t.position.set((i - 2) * 2, 0.01, (j - 2) * 2);
                t.rotation.x = -Math.PI / 2;
                t.receiveShadow = true;
                t.userData = { id: `tile_${i}_${j}`, x: i, z: j, targetX: (i-2)*2, targetZ: (j-2)*2, originalMaterial: mat };
                this.tileGroup.add(t);
                this.floorTiles.push(t);
                this.cadObjects.push(t);
            }
        }
    }

    // Removed legacy Katamari spawner methods for cleanliness

    buildJumpingPuzzle() {
        const platformGeo = new THREE.BoxGeometry(4, 1, 4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.5, metalness: 0.1 });
        
        const path = [
            { x: 0, y: 1.5, z: -5 },
            { x: 4, y: 3.0, z: -8 },
            { x: 8, y: 4.5, z: -5 },
            { x: 12, y: 6.0, z: 0 },
            { x: 8, y: 8.0, z: 5 },
            { x: 0, y: 10.0, z: 8 },
            { x: -6, y: 12.0, z: 4 }
        ];

        path.forEach((p, idx) => {
            const mesh = new THREE.Mesh(platformGeo, mat);
            mesh.position.set(p.x, p.y - 0.5, p.z); // The top of the platform is at p.y
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            
            // Calculate AABB for fast collision
            const box = new THREE.Box3().setFromObject(mesh);
            this.platforms.push({ mesh, box, topY: p.y });
            
            // Add a Crystal Collectible on top of each platform
            const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
            const crystalMat = new THREE.MeshStandardMaterial({ 
                color: 0xff00ff, emissive: 0xff00aa, 
                roughness: 0.1, metalness: 0.8,
                transparent: true, opacity: 0.9
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            crystal.position.set(p.x, p.y + 1.0, p.z);
            
            // PointLight inside crystal
            const cLight = new THREE.PointLight(0xff00ff, 0.5, 3);
            crystal.add(cLight);
            
            this.scene.add(crystal);
            this.crystals.push({ mesh: crystal, active: true });
        });
    }

    createLantern() {
        this.lanternLight = new THREE.PointLight(0xff9900, 1.5, 8);
        this.lanternLight.castShadow = true;
        this.lanternLight.visible = false;
        return this.lanternLight;
    }

    applySimonUI(simonState) {
        if (!simonState) return;
        if(simonState.currentTarget && simonState.mode === 'action') {
            for(let t of this.floorTiles) t.material.color.setHex(0xffffff);
        } else if (simonState.currentTarget && simonState.mode === 'position') {
            const tgtX = simonState.currentTarget.x;
            const tgtZ = simonState.currentTarget.z;
            for(let t of this.floorTiles) {
                if (t.userData.x === tgtX && t.userData.z === tgtZ) {
                    t.material.color.setHex(0xffeb3b);
                } else {
                    t.material.color.setHex(0xaaaaaa);
                }
            }
        } else {
            for(let t of this.floorTiles) t.material.color.setHex(0xffffff);
        }
    }

    // Katamari sync method removed.

    setCore(core) {
        this.core = core;
        if (!this.camera && core.camera) this.camera = core.camera;
    }

    init(scene) {
        if (scene) this.scene = scene;
        // Apply any groups added during the proxy constructor phase
        if (this._pendingAdds) {
            this._pendingAdds.forEach(obj => this.scene.add(obj));
            this._pendingAdds = [];
        }
    }

    update(dt) {
        if (!this.player) return;

        // Kinematic Character Controller Logic
        const speed = 12.0;
        const jumpForce = 15.0;
        const gravity = -30.0;
        
        // Horizontal Movement
        let inputX = this.agentInput.x;
        let inputZ = this.agentInput.z;
        let inputJump = this.agentInput.jump || this.keys.Space;
        
        if (this.keys.KeyW) inputZ -= 1;
        if (this.keys.KeyS) inputZ += 1;
        if (this.keys.KeyA) inputX -= 1;
        if (this.keys.KeyD) inputX += 1;
        
        // Reset agent input to act as 1-frame trigger
        this.agentInput.x = 0;
        this.agentInput.z = 0;
        this.agentInput.jump = false;
        
        // Normalize input vector to prevent diagonal speedup
        if (inputX !== 0 || inputZ !== 0) {
            const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
            inputX /= length;
            inputZ /= length;
        }

        // Apply movement velocity
        this.playerVelocity.x = inputX * speed;
        this.playerVelocity.z = inputZ * speed;
        
        // Rotate player to face movement direction
        if (inputX !== 0 || inputZ !== 0) {
            const targetAngle = Math.atan2(inputX, inputZ);
            
            // Simple rotation (instant)
            this.player.rotation.y = targetAngle;
        }

        // Apply gravity
        this.playerVelocity.y += gravity * dt;

        // Jumping
        if (inputJump && this.isGrounded) {
            this.playerVelocity.y = jumpForce;
            this.isGrounded = false;
        }

        // Integrate position (XZ first)
        this.player.position.x += this.playerVelocity.x * dt;
        this.player.position.z += this.playerVelocity.z * dt;

        // Player Bounds (Radius 0.5, HalfHeight 0.5, Origin is center of capsule)
        const playerRadius = 0.5;
        const playerBottomOffset = 1.0; // Distance from center to bottom

        // Check if we hit a platform before updating Y
        let groundY = 0.0; // Floor is at Y=0
        let onPlatform = false;

        // Simple AABB check against platforms
        for (const plat of this.platforms) {
            // Check XZ overlap
            if (this.player.position.x + playerRadius > plat.box.min.x &&
                this.player.position.x - playerRadius < plat.box.max.x &&
                this.player.position.z + playerRadius > plat.box.min.z &&
                this.player.position.z - playerRadius < plat.box.max.z) {
                
                // If player is falling and their bottom edge passes through the platform's top
                const futureBottom = this.player.position.y + this.playerVelocity.y * dt - playerBottomOffset;
                const currentBottom = this.player.position.y - playerBottomOffset;
                
                if (currentBottom >= plat.topY - 0.2 && futureBottom <= plat.topY) {
                    groundY = plat.topY;
                    onPlatform = true;
                    break;
                }
            }
        }

        // Integrate position
        this.player.position.y += this.playerVelocity.y * dt;

        // Collision Resolution
        if (this.player.position.y - playerBottomOffset <= groundY) {
            this.player.position.y = groundY + playerBottomOffset;
            this.playerVelocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
        
        // Collectibles Logic
        for (const c of this.crystals) {
            if (c.active) {
                // Bob and spin
                c.mesh.rotation.y += 2.0 * dt;
                c.mesh.rotation.x += 1.0 * dt;
                
                // Distance check
                const dx = this.player.position.x - c.mesh.position.x;
                const dy = this.player.position.y - c.mesh.position.y;
                const dz = this.player.position.z - c.mesh.position.z;
                if ((dx*dx + dy*dy + dz*dz) < 2.5) { // Collision radius
                    c.active = false;
                    this.scene.remove(c.mesh);
                    this.score++;
                    if (window.updateScore) window.updateScore(this.score);
                }
            }
        }

        // Camera Follow
        if (this.camera && this.core && this.core.controls) {
            const offset = new THREE.Vector3(0, 5, 10);
            const targetCamPos = this.player.position.clone().add(offset);
            this.camera.position.lerp(targetCamPos, 0.1);
            this.core.controls.target.lerp(this.player.position, 0.2);
            this.core.controls.update();
        }
    }

}
